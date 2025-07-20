# Dynamic SQLite API System

A comprehensive Node.js + Express backend that automatically serves any SQLite table with full CRUD operations, pagination, search, and sorting capabilities.

## 🚀 Features

### Core Functionality
- **Automatic Table Discovery**: Dynamically loads all SQLite tables without manual configuration
- **Universal CRUD Operations**: Create, Read, Update, Delete for any table
- **Server-side Pagination**: Efficient pagination with customizable page sizes
- **Intelligent Search**: Multi-field search across text columns
- **Flexible Sorting**: Sort by any column with ascending/descending order
- **Schema Introspection**: Automatic detection of column types and constraints
- **Parameterized SQL**: Built-in SQL injection protection

### Advanced Features
- **Smart Default Sorting**: Automatically sorts by date columns when available
- **Multi-term Search**: Search for multiple words across multiple columns
- **Performance Optimized**: Concurrent queries and cached table schemas
- **Authentication Ready**: Integrates with existing JWT authentication
- **Error Handling**: Comprehensive error handling and logging
- **Type Safety**: Automatic column type detection and validation

## 📊 API Endpoints

### Discovery Endpoints
```http
GET /api/tables                    # List all available tables
GET /api/tables/:table/schema       # Get table schema information
```

### Data Operations
```http
GET /api/:table                     # Get paginated table data
GET /api/:table/:id                 # Get single record by ID
POST /api/:table                    # Create new record
PUT /api/:table/:id                 # Update existing record
DELETE /api/:table/:id              # Delete record
```

## 🔗 Query Parameters

### Pagination
- `page=1` - Page number (default: 1)
- `limit=50` - Records per page (default: 50, max: 1000)

### Search
- `search=term` - Search across text fields
- `search=honda civic` - Multi-term search

### Sorting
- `sortBy=column` - Sort by specific column
- `sortOrder=ASC|DESC` - Sort direction (default: DESC by date columns)

## 📝 Example Usage

### Basic Pagination
```bash
curl "https://localhost:5001/api/oil_change_records?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search with Pagination
```bash
curl "https://localhost:5001/api/oil_change_records?search=Honda&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Custom Sorting
```bash
curl "https://localhost:5001/api/oil_change_records?sortBy=service_date&sortOrder=DESC&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Single Record
```bash
curl "https://localhost:5001/api/oil_change_records/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create New Record
```bash
curl -X POST "https://localhost:5001/api/oil_change_records" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Smith",
    "vehicle_vin": "1HGCM82633A123456",
    "vehicle_make": "Honda",
    "oil_type": "5W-30 Synthetic",
    "mileage": 25000
  }'
```

### Update Record
```bash
curl -X PUT "https://localhost:5001/api/oil_change_records/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mileage": 26000,
    "notes": "Updated mileage"
  }'
```

### Delete Record
```bash
curl -X DELETE "https://localhost:5001/api/oil_change_records/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📋 Response Format

### Paginated Data Response
```json
{
  "data": [
    {
      "id": 1,
      "customer_name": "John Smith",
      "vehicle_vin": "1HGCM82633A123456",
      "service_date": "2024-01-15T00:00:00.000Z",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "tableName": "oil_change_records",
    "schema": {
      "columns": [...],
      "searchableColumns": ["customer_name", "vehicle_vin", "notes"],
      "dateColumns": ["service_date", "created_at", "updated_at"]
    },
    "sortedBy": "service_date",
    "sortOrder": "DESC",
    "searchTerm": ""
  }
}
```

### Table Schema Response
```json
{
  "columns": [
    {
      "name": "id",
      "type": "INTEGER",
      "notNull": true,
      "primaryKey": true
    },
    {
      "name": "customer_name",
      "type": "TEXT",
      "notNull": true,
      "primaryKey": false
    }
  ],
  "dateColumns": ["service_date", "created_at", "updated_at"],
  "searchableColumns": ["customer_name", "vehicle_vin", "notes"]
}
```

## 🛠 Setup and Installation

### 1. Install Dependencies
The dynamic API uses the same dependencies as the main server:
```bash
cd server
npm install sqlite3 express winston
```

### 2. Integration
The dynamic API is automatically integrated when you start the main server:
```bash
cd server
node index.js
```

### 3. Create Example Tables (Optional)
```bash
node server/createExampleTables.js
```

### 4. Test the API
```bash
node test-dynamic-api.js
```

## 🗄️ Example Tables

The system includes example table creation scripts with realistic automotive service data:

### oil_change_records
- Customer information and vehicle details
- Oil type, filter brand, service dates
- Technician assignments and service notes
- Cost tracking and next service scheduling

### emissions_test_records  
- Vehicle emissions testing records
- Test types (OBD, Tailpipe, Visual, Comprehensive)
- Pass/Fail results and certificate numbers
- Inspector assignments and retest requirements

### tire_installation_records
- Tire installation and service records
- Brand, model, size, and type tracking
- Installation types (New, Rotation, Replacement)
- Pressure settings and alignment history

### customer_vehicle_profiles
- Comprehensive customer and vehicle profiles
- Service history and preferences
- Insurance and registration tracking
- Technician preferences and service notes

## 🔧 Smart Features

### Automatic Column Detection
The system automatically identifies:
- **Date Columns**: Any column with 'date', 'time', 'created', or 'updated' in the name
- **Searchable Columns**: Text fields and common searchable field names
- **Primary Keys**: For efficient single record lookups

### Intelligent Sorting
Default sorting priority:
1. `created_at` or `created` columns
2. `updated_at` or `updated` columns  
3. Any other date/time column
4. Primary key column
5. First available column

### Multi-term Search
- Searches across all text-based columns simultaneously
- Supports multiple search terms (space-separated)
- Uses LIKE queries with wildcard matching
- Combines results with OR logic across columns and AND logic for terms

## 🔒 Security Features

### SQL Injection Prevention
- All queries use parameterized SQL
- Table names are validated against actual database schema
- User input is properly escaped and sanitized

### Authentication Integration
- Integrates with existing JWT authentication system
- Respects existing user roles and permissions
- Can be easily configured with custom authentication middleware

### Rate Limiting
- Inherits rate limiting from the main server
- Configurable limits for different environments
- Performance caps (max 1000 records per request)

## 🚀 Performance Optimization

### Caching
- Table schemas are cached in memory
- Reduces database queries for metadata
- Automatic cache refresh when needed

### Concurrent Operations
- Pagination and count queries run in parallel
- Multiple table operations can be concurrent
- Optimized for high-throughput scenarios

### Query Optimization
- Efficient LIMIT/OFFSET pagination
- Indexed column detection for optimal sorting
- Minimal data transfer with precise column selection

## 🧪 Testing

### Comprehensive Test Suite
Run the complete test suite:
```bash
node test-dynamic-api.js
```

### Test Coverage
- Authentication and authorization
- All CRUD operations
- Pagination edge cases
- Search functionality
- Sorting variations
- Error handling
- Performance benchmarks
- Concurrent request handling

### Example Test Output
```
🚀 Starting Dynamic API Tests...

🔍 Test 1: Listing all available tables
✅ Available tables: ["oil_change_records", "emissions_test_records", ...]

🔍 Test 2: Getting schema for table 'oil_change_records'
✅ Table schema: {columns: [...], searchableColumns: [...]}

🔍 Test 3: Basic pagination for 'oil_change_records'
✅ Paginated results: {dataCount: 3, pagination: {...}}
```

## 🔄 Integration Examples

### Frontend JavaScript
```javascript
// Get paginated data
const response = await fetch('/api/oil_change_records?page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, pagination } = await response.json();

// Search records
const searchResponse = await fetch('/api/oil_change_records?search=Honda&limit=5', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### React Integration
```jsx
const [records, setRecords] = useState([]);
const [pagination, setPagination] = useState({});

const fetchRecords = async (page = 1, search = '') => {
  const response = await api.get(`/oil_change_records?page=${page}&search=${search}`);
  setRecords(response.data.data);
  setPagination(response.data.pagination);
};
```

### Python Integration
```python
import requests

# Get table data
response = requests.get(
    'https://localhost:5001/api/oil_change_records',
    headers={'Authorization': f'Bearer {token}'},
    params={'page': 1, 'limit': 10, 'search': 'Honda'}
)
data = response.json()
```

## 📈 Monitoring and Logging

### Built-in Logging
- All database operations are logged
- Performance metrics for slow queries
- Error tracking with detailed context
- User activity logging

### Health Checks
```bash
# Check if dynamic API is working
curl "https://localhost:5001/api/tables" -H "Authorization: Bearer TOKEN"
```

## 🔧 Configuration

### Environment Variables
```bash
# Database path (default: ./database.sqlite)
DB_PATH=./custom/path/database.sqlite

# JWT Secret for authentication
JWT_SECRET=your-secret-key

# Server port (default: 5001)
PORT=5001
```

### Custom Authentication
```javascript
// Custom authentication middleware
const customAuth = (req, res, next) => {
  // Your authentication logic
  next();
};

// Setup with custom auth
dynamicApi.setupRoutes(app, customAuth);
```

## 🚨 Error Handling

### Common Errors
- `404`: Table or record not found
- `400`: Invalid query parameters
- `401`: Authentication required
- `403`: Insufficient permissions
- `500`: Database or server errors

### Error Response Format
```json
{
  "error": "Table oil_change_records not found",
  "code": "TABLE_NOT_FOUND",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

## 📚 Best Practices

### Pagination
- Use reasonable page sizes (10-100 records)
- Always handle pagination metadata
- Implement infinite scroll or numbered pagination

### Search
- Debounce search input to avoid excessive requests
- Provide search suggestions based on searchable columns
- Cache search results when appropriate

### Performance
- Index frequently searched columns
- Use specific column selection when possible
- Monitor query performance and optimize as needed

### Security
- Always validate user permissions before allowing access
- Sanitize user input before display
- Use HTTPS in production environments
- Implement proper rate limiting

## 🎯 Use Cases

### Perfect For
- ✅ Administrative dashboards
- ✅ Data exploration tools
- ✅ Rapid prototyping
- ✅ API-first applications
- ✅ Database browsing interfaces
- ✅ Service record management
- ✅ Customer relationship management

### Not Recommended For
- ❌ Complex business logic
- ❌ Multi-table joins
- ❌ Transaction-heavy operations
- ❌ Real-time data streaming
- ❌ Complex data transformations

## 🔮 Future Enhancements

### Planned Features
- [ ] Advanced filtering (date ranges, numeric comparisons)
- [ ] Export capabilities (CSV, Excel, JSON)
- [ ] Bulk operations (batch create/update/delete)
- [ ] Column-specific search options
- [ ] Advanced aggregation queries
- [ ] Real-time subscriptions
- [ ] Data validation rules
- [ ] Audit logging
- [ ] Soft delete support
- [ ] File upload handling for blob columns

### Contribution
To contribute to the dynamic API system:
1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## 📞 Support

For issues or questions:
- Check the test suite for usage examples
- Review server logs for error details
- Verify table schemas match expected format
- Ensure proper authentication tokens
- Test with curl commands first

---

## 🏁 Quick Start

1. **Start the server**: `node server/index.js`
2. **Create example tables**: `node server/createExampleTables.js`
3. **Run tests**: `node test-dynamic-api.js`
4. **Access API**: `https://localhost:5001/api/tables`

The dynamic API system is now ready to serve all your SQLite tables with full CRUD operations, pagination, search, and sorting capabilities! 🎉 