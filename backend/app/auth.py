from datetime import datetime, timezone

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    shop_name: str = Field(min_length=2, max_length=100)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator("full_name", "shop_name")
    @classmethod
    def strip_names(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be empty.")
        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1:
            raise ValueError("Enter a valid email address.")
        local, domain = value.split("@")
        if not local or not domain or "." not in domain:
            raise ValueError("Enter a valid email address.")
        if any(char.isspace() for char in value):
            raise ValueError("Enter a valid email address.")
        return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: str
    role: str


class ShopPublic(BaseModel):
    id: str
    name: str


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    shop: ShopPublic


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
    shop: ShopPublic


class AuthenticatedContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    user_id: ObjectId
    shop_id: ObjectId
    full_name: str
    email: str
    role: str


def public_user(user: dict) -> UserPublic:
    return UserPublic(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
    )


def public_shop(shop: dict) -> ShopPublic:
    return ShopPublic(id=str(shop["_id"]), name=shop["name"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest, request: Request):
    db = request.app.state.db
    email = payload.email
    now = datetime.now(timezone.utc)

    existing = await db.users.find_one({"email": email}, {"_id": 1})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    shop_id = ObjectId()
    user_id = ObjectId()
    shop = {
        "_id": shop_id,
        "name": payload.shop_name,
        "owner_user_id": user_id,
        "is_active": True,
        "created_at": now,
    }
    user = {
        "_id": user_id,
        "full_name": payload.full_name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "shop_id": shop_id,
        "role": "owner",
        "is_active": True,
        "created_at": now,
    }

    try:
        await db.shops.insert_one(shop)
        await db.users.insert_one(user)
    except DuplicateKeyError:
        await db.shops.delete_one({"_id": shop_id})
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from None
    except PyMongoError:
        await db.shops.delete_one({"_id": shop_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not create the account right now. Please try again.",
        ) from None

    return RegisterResponse(
        access_token=create_access_token(str(user_id)),
        user=public_user(user),
        shop=public_shop(shop),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request):
    db = request.app.state.db
    user = await db.users.find_one({"email": payload.email})
    if (
        not user
        or not user.get("is_active", False)
        or not verify_password(payload.password, user["password_hash"])
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    shop = await db.shops.find_one(
        {"_id": user["shop_id"], "is_active": True}
    )
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This shop is inactive. Contact support.",
        )

    return LoginResponse(
        access_token=create_access_token(str(user["_id"])),
        user=public_user(user),
        shop=public_shop(shop),
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(credentials.credentials)
        user_id_text = claims.get("sub", "")
        if not ObjectId.is_valid(user_id_text):
            raise ValueError("Invalid user id")
        user_id = ObjectId(user_id_text)
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    db = request.app.state.db
    user = await db.users.find_one(
        {"_id": user_id, "is_active": True}
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    shop = await db.shops.find_one(
        {"_id": user["shop_id"], "is_active": True},
        {"_id": 1},
    )
    if not shop:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This shop is inactive.",
        )

    return AuthenticatedContext(
        user_id=user["_id"],
        shop_id=user["shop_id"],
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
    )


@router.get("/me")
async def me(current_user: AuthenticatedContext = Depends(get_current_user)):
    return {
        "user": {
            "id": str(current_user.user_id),
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": current_user.role,
        },
        "shop_id": str(current_user.shop_id),
    }
