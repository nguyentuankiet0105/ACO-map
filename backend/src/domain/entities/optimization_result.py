"""
Domain Entity: Optimization Result
Contains the complete result of the ACO algorithm
"""
from dataclasses import dataclass
from typing import List, Dict, Any
from .path import Path


@dataclass(frozen=True)
class OptimizationResult:
    """Result of path optimization"""
    best_path: Path
    iterations_history: List[Dict[str, Any]]
    total_iterations: int
    ants_per_iteration: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "best_path": list(self.best_path.nodes) if self.best_path.is_valid() else None,
            "distance": self.best_path.distance if self.best_path.is_valid() else None,
            "iterations": self.iterations_history,
            "total_iterations": self.total_iterations,
            "ants_per_iteration": self.ants_per_iteration
        }
