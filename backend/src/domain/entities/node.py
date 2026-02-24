"""
Domain Entity: Node
Represents a geographical point in the route network
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Node:
    """Immutable node entity representing a location"""
    id: str
    latitude: float
    longitude: float
    name: str

    def __post_init__(self):
        if not self.id:
            raise ValueError("Node ID cannot be empty")
        if not (-90 <= self.latitude <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        if not (-180 <= self.longitude <= 180):
            raise ValueError("Longitude must be between -180 and 180")
