"""
Path Finder Interface (SOLID - Interface Segregation Principle)
Defines contract for pathfinding algorithms
"""
from abc import ABC, abstractmethod
from typing import List
from ..entities import Graph, Path


class IPathFinderAlgorithm(ABC):
    """Interface for pathfinding algorithms"""

    @abstractmethod
    def find_optimal_path(
        self,
        graph: Graph,
        start_node: str,
        end_node: str,
        blocked_edges: List[tuple] = None
    ) -> Path:
        """Find optimal path between two nodes"""
        pass
