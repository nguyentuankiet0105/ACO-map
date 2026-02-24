"""
Domain Entity: Edge
Represents a connection between two nodes with a weight (distance/cost)
"""
from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class Edge:
    """Immutable edge entity representing a route between two nodes"""
    from_node: str
    to_node: str
    weight: float
    is_blocked: bool = False

    def __post_init__(self):
        if self.weight < 0:
            raise ValueError("Edge weight cannot be negative")
        if self.from_node == self.to_node:
            raise ValueError("Edge cannot connect a node to itself")

    def as_tuple(self) -> Tuple[str, str]:
        """Return edge as tuple for compatibility"""
        return (self.from_node, self.to_node)

    def reverse(self) -> 'Edge':
        """Return reversed edge"""
        return Edge(
            from_node=self.to_node,
            to_node=self.from_node,
            weight=self.weight,
            is_blocked=self.is_blocked
        )
