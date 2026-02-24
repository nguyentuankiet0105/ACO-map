"""
Domain Entity: Path
Represents a route found by the algorithm
"""
from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Path:
    """Immutable path entity"""
    nodes: List[str]
    distance: float

    def __post_init__(self):
        if not self.nodes:
            raise ValueError("Path must contain at least one node")
        if self.distance < 0:
            raise ValueError("Distance cannot be negative")

    def __len__(self) -> int:
        return len(self.nodes)

    def is_valid(self) -> bool:
        """Check if path is valid"""
        return len(self.nodes) > 0 and self.distance < float('inf')
