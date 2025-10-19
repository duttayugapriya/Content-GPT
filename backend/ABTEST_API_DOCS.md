# A/B Testing API Documentation

This document provides comprehensive documentation for the A/B Testing API endpoints in the Marketing GPT application.

## 🚀 Quick Start

### Prerequisites

- Node.js installed
- MongoDB running (local or cloud)
- Environment variables configured

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
MONGODB_URI=mongodb://localhost:27017/marketing_gpt
COHERE_API_KEY=your_cohere_api_key
GOOGLE_SHEETS_CREDENTIALS=path/to/credentials.json
SLACK_WEBHOOK_URL=your_slack_webhook_url
PORT=5000
```

### Start the Server

```bash
npm start
# or for development
npm run dev
```

## 📊 Database Schema

### Campaign Collection

```javascript
{
  campaign_id: String (unique, indexed),
  contentA: String (required),
  contentB: String (required),
  metrics: {
    A: {
      likes: Number (default: 0),
      comments: Number (default: 0),
      shares: Number (default: 0),
      views: Number (default: 0),
      clicks: Number (default: 0)
    },
    B: {
      likes: Number (default: 0),
      comments: Number (default: 0),
      shares: Number (default: 0),
      views: Number (default: 0),
      clicks: Number (default: 0)
    }
  },
  winner: String (enum: ['A', 'B', null]),
  status: String (enum: ['active', 'completed', 'cancelled']),
  platform: String (enum: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'General']),
  target_audience: String,
  tone: String,
  feedback_prompt: String,
  performance_insights: String,
  created_at: Date,
  updated_at: Date,
  completed_at: Date
}
```

## 🔗 API Endpoints

### 1. Start A/B Test Campaign

**POST** `/api/abtest/start`

Starts a new A/B test campaign with two content versions.

#### Request Body

```json
{
  "contentA": "Your first content version",
  "contentB": "Your second content version",
  "platform": "Instagram", // Optional, default: "General"
  "target_audience": "Health-conscious millennials", // Optional
  "tone": "Professional" // Optional
}
```

#### Response

```json
{
  "success": true,
  "message": "A/B test campaign started successfully",
  "data": {
    "campaign_id": "campaign_1a2b3c4d5e_xyz123",
    "status": "active",
    "created_at": "2024-01-15T10:30:00.000Z",
    "platform": "Instagram"
  }
}
```

#### Example Usage

```bash
curl -X POST http://localhost:5000/api/abtest/start \
  -H "Content-Type: application/json" \
  -d '{
    "contentA": "Discover our amazing new product! Click to learn more.",
    "contentB": "🚀 Ready to transform your life? Our new product is here!",
    "platform": "Instagram",
    "target_audience": "Young professionals",
    "tone": "Energetic"
  }'
```

### 2. Update Engagement Metrics

**POST** `/api/abtest/update`

Updates engagement metrics for both content versions.

#### Request Body

```json
{
  "campaign_id": "campaign_1a2b3c4d5e_xyz123",
  "metricsA": {
    "likes": 150,
    "comments": 25,
    "shares": 10,
    "views": 1200,
    "clicks": 45
  },
  "metricsB": {
    "likes": 200,
    "comments": 35,
    "shares": 15,
    "views": 1500,
    "clicks": 60
  },
  "simulate": false // Optional, set to true to simulate metrics
}
```

#### Response

```json
{
  "success": true,
  "message": "Metrics updated successfully",
  "data": {
    "campaign_id": "campaign_1a2b3c4d5e_xyz123",
    "metrics": {
      "A": {
        "likes": 150,
        "comments": 25,
        "shares": 10,
        "views": 1200,
        "clicks": 45
      },
      "B": {
        "likes": 200,
        "comments": 35,
        "shares": 15,
        "views": 1500,
        "clicks": 60
      }
    },
    "total_engagement_a": 185,
    "total_engagement_b": 250
  }
}
```

#### Simulate Metrics

```bash
curl -X POST http://localhost:5000/api/abtest/update \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "campaign_1a2b3c4d5e_xyz123",
    "simulate": true
  }'
```

### 3. Get A/B Test Results

**GET** `/api/abtest/result/:campaign_id`

Retrieves A/B test results and determines the winner.

#### Response

```json
{
  "success": true,
  "data": {
    "campaign_id": "campaign_1a2b3c4d5e_xyz123",
    "status": "completed",
    "winner": "B",
    "performance_summary": {
      "winner": "B",
      "total_engagement": 435,
      "engagement_a": {
        "total": 185,
        "percentage": "42.53",
        "metrics": { "likes": 150, "comments": 25, "shares": 10, "views": 1200, "clicks": 45 }
      },
      "engagement_b": {
        "total": 250,
        "percentage": "57.47",
        "metrics": { "likes": 200, "comments": 35, "shares": 15, "views": 1500, "clicks": 60 }
      },
      "improvement_percentage": "35.14"
    },
    "content": {
      "A": "Discover our amazing new product! Click to learn more.",
      "B": "🚀 Ready to transform your life? Our new product is here!"
    },
    "platform": "Instagram",
    "target_audience": "Young professionals",
    "tone": "Energetic",
    "feedback_prompt": "Version B performed better due to higher engagement...",
    "performance_insights": { ... }
  }
}
```

### 4. Complete A/B Test

**POST** `/api/abtest/complete`

Manually completes an A/B test and determines the winner.

#### Request Body

```json
{
  "campaign_id": "campaign_1a2b3c4d5e_xyz123"
}
```

#### Response

```json
{
  "success": true,
  "message": "A/B test completed successfully",
  "data": {
    "campaign_id": "campaign_1a2b3c4d5e_xyz123",
    "winner": "B",
    "performance_summary": { ... },
    "feedback_prompt": "AI-generated feedback for improvement...",
    "completed_at": "2024-01-15T11:30:00.000Z"
  }
}
```

### 5. Get All Campaigns

**GET** `/api/abtest/campaigns`

Retrieves all campaigns with optional filtering and pagination.

#### Query Parameters

- `status`: Filter by status (active, completed, cancelled)
- `platform`: Filter by platform
- `limit`: Number of results per page (default: 10)
- `page`: Page number (default: 1)

#### Example

```bash
curl "http://localhost:5000/api/abtest/campaigns?status=completed&platform=Instagram&limit=5&page=1"
```

#### Response

```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "campaign_id": "campaign_1a2b3c4d5e_xyz123",
        "contentA": "Content A...",
        "contentB": "Content B...",
        "winner": "B",
        "status": "completed",
        "platform": "Instagram",
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 25,
      "pages": 5
    }
  }
}
```

### 6. Get Statistics

**GET** `/api/abtest/statistics`

Retrieves A/B testing statistics and insights.

#### Response

```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_campaigns": 50,
      "active_campaigns": 5,
      "completed_campaigns": 45,
      "a_wins": 20,
      "b_wins": 22,
      "ties": 3
    },
    "recent_campaigns": [
      {
        "campaign_id": "campaign_1a2b3c4d5e_xyz123",
        "winner": "B",
        "metrics": { ... },
        "platform": "Instagram",
        "completed_at": "2024-01-15T11:30:00.000Z"
      }
    ]
  }
}
```

### 7. Delete Campaign

**DELETE** `/api/abtest/:campaign_id`

Deletes a specific campaign.

#### Response

```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

## 🤖 AI Feedback System

The system automatically generates AI-powered feedback using Cohere AI to help improve future content generation.

### Feedback Generation Process

1. Analyzes winning vs losing content
2. Identifies key differences and patterns
3. Generates actionable insights
4. Creates improvement recommendations

### Example Feedback

```
Version B performed better due to higher engagement. Key insights:
1. Emojis increase engagement by 25%
2. Questions drive more comments
3. Shorter content performs better on Instagram
4. Call-to-action placement matters

Recommendations for future content:
- Use emojis strategically
- Include interactive questions
- Keep content concise
- Place CTAs at the end
```

## 📈 Metrics Simulation

The system includes intelligent metrics simulation for testing purposes.

### Simulation Factors

- **Content length**: Optimal length gets higher engagement
- **Emojis**: Presence of emojis increases engagement
- **Questions**: Interactive content drives more comments
- **Call-to-action**: Clear CTAs increase clicks
- **Platform**: Different platforms have different engagement patterns

### Platform Multipliers

- Instagram: 1.5x likes, 1.2x comments, 1.3x shares
- Facebook: 1.3x likes, 1.5x comments, 1.4x shares
- Twitter: 1.1x likes, 1.8x comments, 1.6x shares
- LinkedIn: 1.2x likes, 1.3x comments, 1.1x shares
- TikTok: 2.0x likes, 1.4x comments, 1.8x shares
- YouTube: 1.4x likes, 1.6x comments, 1.2x shares

## 🔧 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common Error Codes

- `400`: Bad Request (missing required fields)
- `404`: Not Found (campaign doesn't exist)
- `500`: Internal Server Error (server/database issues)

## 🧪 Testing

### Test with cURL

```bash
# Start a test
curl -X POST http://localhost:5000/api/abtest/start \
  -H "Content-Type: application/json" \
  -d '{"contentA": "Test A", "contentB": "Test B"}'

# Update metrics
curl -X POST http://localhost:5000/api/abtest/update \
  -H "Content-Type: application/json" \
  -d '{"campaign_id": "YOUR_CAMPAIGN_ID", "simulate": true}'

# Get results
curl http://localhost:5000/api/abtest/result/YOUR_CAMPAIGN_ID
```

### Test with JavaScript

```javascript
// Start A/B test
const startTest = async () => {
  const response = await fetch("http://localhost:5000/api/abtest/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentA: "Version A content",
      contentB: "Version B content",
      platform: "Instagram",
    }),
  });
  return response.json();
};

// Update metrics
const updateMetrics = async (campaignId) => {
  const response = await fetch("http://localhost:5000/api/abtest/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaign_id: campaignId,
      simulate: true,
    }),
  });
  return response.json();
};
```

## 🚀 Production Considerations

### Database

- Use MongoDB Atlas for production
- Set up proper indexes for performance
- Implement data retention policies

### Security

- Add authentication/authorization
- Validate all input data
- Implement rate limiting
- Use HTTPS in production

### Monitoring

- Add logging and monitoring
- Set up alerts for failures
- Monitor database performance
- Track API usage

### Scaling

- Use connection pooling
- Implement caching
- Consider microservices architecture
- Add load balancing

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Cohere AI API](https://docs.cohere.ai/)
- [A/B Testing Best Practices](https://www.optimizely.com/optimization-glossary/ab-testing/)
