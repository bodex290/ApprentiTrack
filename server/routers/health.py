from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check():
    """Return a simple health-check response."""
    return {"status": "healthy"}
