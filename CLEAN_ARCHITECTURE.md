# Clean Architecture Implementation

## 🏗️ Architecture Overview

This project follows **Clean Architecture** principles with **SOLID** design patterns.

---

## 📁 Project Structure

### Backend (Python/Flask)

```
backend/
├── src/
│   ├── domain/                    # Enterprise Business Rules
│   │   ├── entities/              # Core business objects
│   │   │   ├── node.py           # Node entity (immutable)
│   │   │   ├── edge.py           # Edge entity (immutable)
│   │   │   ├── graph.py          # Graph aggregate root
│   │   │   ├── path.py           # Path value object
│   │   │   └── optimization_result.py
│   │   └── interfaces/            # Abstract interfaces (DIP)
│   │       ├── igraph_repository.py
│   │       └── ipath_finder_algorithm.py
│   │
│   ├── application/               # Application Business Rules
│   │   ├── use_cases/            # Use case orchestrators
│   │   │   ├── find_optimal_path_use_case.py
│   │   │   └── get_graph_use_case.py
│   │   └── services/             # Application services
│   │       └── path_optimization_service.py
│   │
│   ├── infrastructure/            # Frameworks & Drivers
│   │   ├── algorithms/           # Algorithm implementations
│   │   │   └── aco_algorithm.py  # ACO implementation
│   │   └── repositories/         # Data access implementations
│   │       └── in_memory_graph_repository.py
│   │
│   └── presentation/             # Interface Adapters
│       ├── controllers/          # API controllers
│       │   └── route_controller.py
│       ├── routes/              # Flask route definitions
│       │   └── api_routes.py
│       └── dto/                 # Data Transfer Objects
│           └── route_dto.py
│
├── config/                      # Configuration files
│   └── settings.py
├── tests/                       # Unit & Integration tests
└── app.py                       # Application entry point
```

### Frontend (React + TypeScript)

```
frontend/
├── src/
│   ├── domain/                    # Business Logic Layer
│   │   ├── entities/             # TypeScript interfaces
│   │   │   ├── Node.ts
│   │   │   ├── Edge.ts
│   │   │   ├── Graph.ts
│   │   │   └── OptimizationResult.ts
│   │   └── types/                # Type definitions
│   │       └── index.ts
│   │
│   ├── application/              # Use Cases Layer
│   │   ├── useCases/            # Business logic
│   │   │   ├── FindOptimalPath.ts
│   │   │   └── GetGraph.ts
│   │   └── services/            # Application services
│   │       └── PathOptimizationService.ts
│   │
│   ├── infrastructure/           # External Services
│   │   ├── api/                 # API clients
│   │   │   └── RouteApiClient.ts
│   │   └── maps/                # Google Maps integration
│   │       └── GoogleMapsService.ts
│   │
│   ├── presentation/            # UI Layer
│   │   ├── components/          # React components
│   │   │   ├── common/         # Reusable components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── map/            # Map-related components
│   │   │   └── controls/       # Control panel components
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useOptimization.ts
│   │   │   └── useGraph.ts
│   │   ├── pages/              # Page components
│   │   │   └── MapVisualization.tsx
│   │   └── styles/             # CSS/styling
│   │
│   ├── shared/                  # Shared utilities
│   │   ├── utils/              # Helper functions
│   │   └── constants/          # Constants
│   │
│   └── config/                  # Configuration
│       └── config.ts
│
├── public/
├── tsconfig.json               # TypeScript configuration
└── package.json
```

---

## 🎯 SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
- **Each class has ONE reason to change**
- `Node.py`: Only handles node data
- `AcoAlgorithm.py`: Only handles ACO logic
- `RouteController.py`: Only handles HTTP requests

### 2. Open/Closed Principle (OCP)
- **Open for extension, closed for modification**
- `IPathFinderAlgorithm`: Interface allows new algorithms without changing existing code
- Can add Dijkstra, A* etc. by implementing the interface

### 3. Liskov Substitution Principle (LSP)
- **Subtypes must be substitutable for base types**
- Any implementation of `IPathFinderAlgorithm` can replace `AcoAlgorithm`
- Repository implementations are interchangeable

### 4. Interface Segregation Principle (ISP)
- **Clients shouldn't depend on interfaces they don't use**
- `IGraphRepository`: Focused on graph operations
- `IPathFinderAlgorithm`: Focused on pathfinding only

### 5. Dependency Inversion Principle (DIP)
- **Depend on abstractions, not concretions**
- Use cases depend on `IGraphRepository` interface, not concrete implementation
- Controllers depend on use case interfaces

---

## 📊 Layer Dependencies

```
Presentation Layer (Controllers, Views)
         ↓
Application Layer (Use Cases, Services)
         ↓
Domain Layer (Entities, Interfaces)
         ↑
Infrastructure Layer (Implementations)
```

**Dependency Rule**: Inner layers don't know about outer layers.

---

## 🔧 Key Design Patterns

### 1. Repository Pattern
- Abstracts data access
- `IGraphRepository` → `InMemoryGraphRepository`
- Easy to switch to database

### 2. Use Case Pattern
- Encapsulates business logic
- `FindOptimalPathUseCase`: Orchestrates pathfinding
- Single entry point for business operations

### 3. Dependency Injection
- Inject dependencies via constructor
- Easier testing and flexibility
- Example: Inject algorithm into use case

### 4. DTO Pattern
- Data Transfer Objects for API communication
- Separates domain entities from API contracts
- `RouteDTO`: API representation

### 5. Factory Pattern (Optional)
- Create complex objects
- `GraphFactory`: Build graph from configuration

---

## 🧪 Testing Strategy

### Unit Tests
```python
# Test domain entities
test_node_validation()
test_edge_creation()

# Test use cases with mocks
test_find_optimal_path_use_case()

# Test algorithms
test_aco_algorithm()
```

### Integration Tests
```python
# Test API endpoints
test_optimize_route_endpoint()
test_get_graph_endpoint()
```

### E2E Tests (Frontend)
```typescript
// Test user flows
test_user_can_find_optimal_path()
test_user_can_block_routes()
```

---

## 🚀 Benefits of This Architecture

### 1. **Testability**
- Easy to test each layer independently
- Mock interfaces for unit tests
- No framework dependencies in domain

### 2. **Maintainability**
- Clear separation of concerns
- Easy to locate and fix bugs
- Changes in one layer don't affect others

### 3. **Flexibility**
- Swap implementations easily
- Change database without touching business logic
- Add new features without breaking existing code

### 4. **Scalability**
- Can add microservices
- Easy to split into separate services
- Domain logic remains unchanged

### 5. **Team Collaboration**
- Different teams can work on different layers
- Clear contracts via interfaces
- Reduced merge conflicts

---

## 📝 Code Examples

### Domain Entity (Immutable)
```python
@dataclass(frozen=True)
class Node:
    id: str
    latitude: float
    longitude: float
    name: str
```

### Interface (Abstraction)
```python
class IPathFinderAlgorithm(ABC):
    @abstractmethod
    def find_optimal_path(self, graph: Graph, start: str, end: str) -> Path:
        pass
```

### Use Case (Business Logic)
```python
class FindOptimalPathUseCase:
    def __init__(self, repository: IGraphRepository, algorithm: IPathFinderAlgorithm):
        self.repository = repository
        self.algorithm = algorithm

    def execute(self, start: str, end: str, blocked_edges: List) -> OptimizationResult:
        graph = self.repository.get_graph()
        path = self.algorithm.find_optimal_path(graph, start, end, blocked_edges)
        return OptimizationResult(...)
```

### Controller (API Layer)
```python
@app.route('/optimize', methods=['POST'])
def optimize():
    use_case = find_optimal_path_use_case  # Injected
    result = use_case.execute(start, end, blocked_edges)
    return jsonify(result.to_dict())
```

---

## 🔄 Migration from Old Code

### Before (Monolithic)
```
backend/
├── app.py          # Everything mixed
└── app/
    └── aco.py      # Algorithm + logic mixed
```

### After (Clean Architecture)
```
backend/
├── src/
│   ├── domain/      # Pure business logic
│   ├── application/ # Use cases
│   ├── infrastructure/ # Implementations
│   └── presentation/   # API layer
```

---

## 📚 References

- **Clean Architecture** by Robert C. Martin
- **Domain-Driven Design** by Eric Evans
- **SOLID Principles** - Uncle Bob
- **Hexagonal Architecture** (Ports & Adapters)

---

## 🎓 Learning Resources

1. [Clean Architecture Book](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)
2. [SOLID Principles](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
3. [React Clean Architecture](https://github.com/eduardomoroni/react-clean-architecture)
4. [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 🔜 Next Steps

1. ✅ Domain entities created
2. ✅ Interfaces defined
3. ✅ ACO algorithm refactored
4. ⏳ Complete use cases
5. ⏳ Implement repositories
6. ⏳ Create controllers
7. ⏳ TypeScript frontend components
8. ⏳ Unit tests
9. ⏳ Integration tests
10. ⏳ Documentation

---

**Status**: 🚧 Refactoring in Progress

The codebase is being migrated to Clean Architecture while maintaining full functionality.
