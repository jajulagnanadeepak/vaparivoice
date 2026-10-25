from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.auth import AuthenticatedContext, get_current_user

router = APIRouter(prefix="/products", tags=["products"])


class ProductCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=120)
    sku: str = Field(min_length=2, max_length=40)
    category: str = Field(default="General", min_length=2, max_length=60)
    unit: str = Field(default="piece", min_length=1, max_length=20)
    selling_price_rupees: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    cost_price_rupees: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    quantity: float = Field(ge=0, le=1_000_000_000)
    low_stock_threshold: float = Field(default=5, ge=0, le=1_000_000_000)

    @field_validator("name", "category", "unit")
    @classmethod
    def validate_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("This field cannot be empty.")
        return value.strip()

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str) -> str:
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z0-9_-]+", value):
            raise ValueError("SKU can contain only letters, numbers, hyphens and underscores.")
        return value


class ProductResponse(BaseModel):
    id: str
    name: str
    sku: str
    category: str
    unit: str
    selling_price_rupees: Decimal
    cost_price_rupees: Decimal
    quantity: float
    low_stock_threshold: float
    is_low_stock: bool
    created_at: datetime


def rupees_to_paise(amount: Decimal) -> int:
    # Store money as integer paise to avoid floating-point currency errors.
    paise = (amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(paise)


def to_product_response(product: dict) -> ProductResponse:
    quantity = product["quantity"]
    return ProductResponse(
        id=str(product["_id"]),
        name=product["name"],
        sku=product["sku"],
        category=product["category"],
        unit=product["unit"],
        selling_price_rupees=Decimal(product["selling_price_paise"]) / 100,
        cost_price_rupees=Decimal(product["cost_price_paise"]) / 100,
        quantity=quantity,
        low_stock_threshold=product["low_stock_threshold"],
        is_low_stock=quantity <= product["low_stock_threshold"],
        created_at=product["created_at"],
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    request: Request,
    current_user: AuthenticatedContext = Depends(get_current_user),
):
    db = request.app.state.db

    product = {
        "_id": ObjectId(),
        # Never accept shop_id from the request body.
        "shop_id": current_user.shop_id,
        "name": payload.name,
        "sku": payload.sku,
        "category": payload.category,
        "unit": payload.unit,
        "selling_price_paise": rupees_to_paise(payload.selling_price_rupees),
        "cost_price_paise": rupees_to_paise(payload.cost_price_rupees),
        "quantity": payload.quantity,
        "low_stock_threshold": payload.low_stock_threshold,
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        await db.products.insert_one(product)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A product with this SKU already exists in your shop.",
        ) from None
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not save the product. Please try again.",
        ) from None

    return to_product_response(product)


@router.get("", response_model=list[ProductResponse])
async def list_products(
    request: Request,
    current_user: AuthenticatedContext = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    db = request.app.state.db

    try:
        cursor = (
            db.products.find({"shop_id": current_user.shop_id})
            .sort("created_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )
        products = await cursor.to_list(length=page_size)
    except PyMongoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not load products. Please try again.",
        ) from None

    return [to_product_response(product) for product in products]