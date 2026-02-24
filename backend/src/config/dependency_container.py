"""
Dependency Injection Container
Manages object creation and dependency injection
"""
from ..infrastructure.repositories import InMemoryGraphRepository
from ..infrastructure.algorithms import AntColonyOptimization
from ..application.use_cases import FindOptimalPathUseCase, GetGraphUseCase
from ..presentation.controllers import RouteController


class DependencyContainer:
    """
    Container for managing dependencies
    Implements Dependency Injection pattern
    """

    def __init__(self):
        self._instances = {}

    def get_graph_repository(self):
        """Get or create graph repository singleton"""
        if 'graph_repository' not in self._instances:
            self._instances['graph_repository'] = InMemoryGraphRepository()
        return self._instances['graph_repository']

    def get_aco_algorithm(self):
        """Create new ACO algorithm instance"""
        return AntColonyOptimization(
            n_ants=15,
            n_iterations=30,
            alpha=1.0,
            beta=2.0,
            evaporation=0.5
        )

    def get_find_optimal_path_use_case(self):
        """Create find optimal path use case"""
        return FindOptimalPathUseCase(
            graph_repository=self.get_graph_repository(),
            path_finder=self.get_aco_algorithm()
        )

    def get_get_graph_use_case(self):
        """Create get graph use case"""
        return GetGraphUseCase(
            graph_repository=self.get_graph_repository()
        )

    def get_route_controller(self):
        """Create route controller"""
        return RouteController(
            find_optimal_path_use_case=self.get_find_optimal_path_use_case(),
            get_graph_use_case=self.get_get_graph_use_case(),
            graph_repository=self.get_graph_repository()
        )
