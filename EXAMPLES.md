# Goose-Flow 2.0 Examples

This document provides practical examples of how to use Goose-Flow 2.0 for various development scenarios.

## Example 1: Simple Web Application

**User Request:** "Create a simple web application with user authentication"

**Orchestrator Response:**

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Plan web application architecture"
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Design web application architecture",
    "prompt": "Design a simple web application with user authentication. Include:\n- Frontend framework selection\n- Backend API structure\n- Database schema for users\n- Authentication flow\n- Security considerations\nProvide a comprehensive design document.",
    "mode": "architect",
    "maxTurns": 15
  }
}
```

*[Architect completes with detailed design]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Implement backend API",
    "prompt": "Based on the provided design, implement the backend API with:\n- User registration and login endpoints\n- JWT token authentication\n- Password hashing and validation\n- Database integration\n- Error handling and validation",
    "mode": "coder",
    "maxTurns": 20
  }
}
```

*[Coder implements backend]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Create frontend application",
    "prompt": "Create a frontend application with:\n- Login and registration forms\n- Protected routes\n- JWT token management\n- User dashboard\n- Responsive design",
    "mode": "coder",
    "maxTurns": 20
  }
}
```

*[Coder creates frontend]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Test complete application",
    "prompt": "Create comprehensive tests for the web application:\n- Unit tests for API endpoints\n- Integration tests for authentication flow\n- Frontend component tests\n- End-to-end testing scenarios",
    "mode": "tester",
    "maxTurns": 15
  }
}
```

## Example 2: Data Processing Pipeline

**User Request:** "Build a data processing pipeline for analyzing log files"

**Orchestrator Response:**

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Research log analysis requirements"
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Research log analysis best practices",
    "prompt": "Research and analyze:\n- Common log file formats and parsing techniques\n- Data processing pipeline patterns\n- Performance optimization strategies\n- Error handling in data pipelines\n- Tools and libraries for log analysis",
    "mode": "researcher",
    "maxTurns": 10
  }
}
```

*[Researcher provides analysis]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Design data processing architecture",
    "prompt": "Design a robust data processing pipeline for log analysis:\n- Input processing and validation\n- Parsing and transformation stages\n- Analytics and aggregation\n- Output formatting and storage\n- Error handling and monitoring",
    "mode": "architect",
    "maxTurns": 15
  }
}
```

*[Architect creates design]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Implement log parser",
    "prompt": "Implement a robust log parser that:\n- Handles multiple log formats\n- Extracts relevant information\n- Validates and cleans data\n- Provides error reporting\n- Supports streaming processing",
    "mode": "coder",
    "maxTurns": 20
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Create analysis engine",
    "prompt": "Implement the analysis engine that:\n- Aggregates log data\n- Generates statistics and metrics\n- Identifies patterns and anomalies\n- Provides configurable reporting\n- Supports real-time processing",
    "mode": "coder",
    "maxTurns": 25
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Test data pipeline",
    "prompt": "Create comprehensive tests for the data pipeline:\n- Unit tests for each component\n- Integration tests for the full pipeline\n- Performance tests with large datasets\n- Error handling validation\n- Edge case testing",
    "mode": "tester",
    "maxTurns": 20
  }
}
```

## Example 3: API Integration Project

**User Request:** "Integrate multiple third-party APIs into our system"

**Orchestrator Response:**

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Research API integration requirements"
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Research third-party APIs",
    "prompt": "Research the following third-party APIs:\n- Authentication methods and requirements\n- Rate limiting and quotas\n- Data formats and schemas\n- Error handling patterns\n- Best practices for integration\nProvide detailed documentation for each API.",
    "mode": "researcher",
    "maxTurns": 15
  }
}
```

*[Research completes]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Design integration architecture",
    "prompt": "Design a robust API integration architecture:\n- Unified interface for multiple APIs\n- Authentication and token management\n- Rate limiting and retry logic\n- Data transformation and validation\n- Error handling and monitoring\n- Caching strategies",
    "mode": "architect",
    "maxTurns": 20
  }
}
```

*[Architecture designed]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Implement API client library",
    "prompt": "Create a unified API client library that:\n- Handles authentication for each API\n- Implements retry logic and rate limiting\n- Provides consistent error handling\n- Supports async operations\n- Includes comprehensive logging",
    "mode": "coder",
    "maxTurns": 25
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Create data transformation layer",
    "prompt": "Implement data transformation layer that:\n- Normalizes data from different APIs\n- Validates and sanitizes input\n- Handles data type conversions\n- Provides mapping configurations\n- Supports custom transformations",
    "mode": "coder",
    "maxTurns": 20
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Test API integrations",
    "prompt": "Create comprehensive tests for API integrations:\n- Mock API responses for testing\n- Test error scenarios and edge cases\n- Validate data transformations\n- Test rate limiting and retry logic\n- Performance testing with concurrent requests",
    "mode": "tester",
    "maxTurns": 20
  }
}
```

## Example 4: Code Review and Optimization

**User Request:** "Review and optimize the performance of our existing codebase"

**Orchestrator Response:**

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Analyze existing codebase"
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Analyze codebase structure",
    "prompt": "Perform a comprehensive analysis of the existing codebase:\n- Code architecture and patterns\n- Performance bottlenecks identification\n- Code quality metrics\n- Security vulnerabilities\n- Technical debt assessment\nProvide detailed findings and recommendations.",
    "mode": "reviewer",
    "maxTurns": 25
  }
}
```

*[Review completes with findings]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Research optimization techniques",
    "prompt": "Research optimization techniques for the identified performance issues:\n- Database query optimization\n- Caching strategies\n- Algorithm improvements\n- Memory management\n- Concurrent processing\nProvide specific recommendations for each issue.",
    "mode": "researcher",
    "maxTurns": 15
  }
}
```

*[Research provides optimization strategies]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Implement performance optimizations",
    "prompt": "Implement the recommended performance optimizations:\n- Optimize database queries and indexes\n- Implement caching layer\n- Improve algorithm efficiency\n- Reduce memory usage\n- Add performance monitoring\nMaintain backward compatibility and code quality.",
    "mode": "coder",
    "maxTurns": 30
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Validate optimizations",
    "prompt": "Create comprehensive performance tests:\n- Benchmark before and after optimizations\n- Load testing with realistic scenarios\n- Memory usage profiling\n- Response time measurements\n- Validate functionality remains intact\nProvide detailed performance improvement report.",
    "mode": "tester",
    "maxTurns": 20
  }
}
```

## Example 5: Documentation and Training

**User Request:** "Create comprehensive documentation and training materials for our new system"

**Orchestrator Response:**

```json
{
  "name": "progress",
  "arguments": {
    "action": "create",
    "description": "Plan documentation strategy"
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Research documentation best practices",
    "prompt": "Research modern documentation best practices:\n- Documentation structure and organization\n- Technical writing guidelines\n- Interactive documentation tools\n- Training material formats\n- User experience considerations\nProvide recommendations for our system.",
    "mode": "researcher",
    "maxTurns": 12
  }
}
```

*[Research completes]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Design documentation architecture",
    "prompt": "Design a comprehensive documentation architecture:\n- Information architecture and navigation\n- Content types and templates\n- User personas and use cases\n- Documentation toolchain\n- Maintenance and update processes",
    "mode": "architect",
    "maxTurns": 15
  }
}
```

*[Architecture designed]*

```json
{
  "name": "task",
  "arguments": {
    "description": "Create technical documentation",
    "prompt": "Create comprehensive technical documentation:\n- API documentation with examples\n- System architecture guides\n- Installation and setup instructions\n- Troubleshooting guides\n- Code examples and tutorials\nEnsure clarity and completeness for developers.",
    "mode": "coder",
    "maxTurns": 25
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Develop training materials",
    "prompt": "Create engaging training materials:\n- Interactive tutorials and walkthroughs\n- Video content scripts\n- Hands-on exercises\n- Assessment materials\n- Quick reference guides\nTarget different skill levels and roles.",
    "mode": "coder",
    "maxTurns": 20
  }
}
```

```json
{
  "name": "task",
  "arguments": {
    "description": "Test documentation effectiveness",
    "prompt": "Validate documentation and training materials:\n- User testing with target audience\n- Content accuracy verification\n- Navigation and usability testing\n- Accessibility compliance\n- Feedback collection and analysis\nProvide improvement recommendations.",
    "mode": "tester",
    "maxTurns": 15
  }
}
```

## Key Patterns

### 1. Always Start with Planning
- Use `progress` to track major steps
- Begin with `researcher` or `architect` for complex tasks
- Break down into phases before implementation

### 2. Appropriate Mode Selection
- **Research** → `researcher`
- **Design** → `architect`
- **Implementation** → `coder`
- **Validation** → `tester`
- **Analysis** → `reviewer`

### 3. Clear Communication
- Provide specific, actionable instructions
- Include context and requirements
- Specify deliverables and success criteria

### 4. Progressive Refinement
- Start with high-level overview
- Gradually increase detail and specificity
- Adapt based on intermediate results

### 5. Quality Assurance
- Always include testing and validation
- Review and optimize implementations
- Document and communicate results

These examples demonstrate how Goose-Flow 2.0 can orchestrate complex development workflows while maintaining clarity, efficiency, and quality throughout the process.