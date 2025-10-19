# A/B Testing Module Setup Guide

This guide will help you set up and use the comprehensive A/B testing module for your AI marketing content generator.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up MongoDB

#### Option A: Local MongoDB

```bash
# Install MongoDB locally
# macOS with Homebrew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Or start manually
mongod --config /usr/local/etc/mongod.conf
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/marketing_gpt
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketing_gpt

# AI Services
COHERE_API_KEY=your_cohere_api_key_here

# Google Sheets (Optional)
GOOGLE_SHEETS_CREDENTIALS=./src/credentials.json
GOOGLE_SHEETS_ID=your_sheet_id_here

# Slack (Optional)
SLACK_WEBHOOK_URL=your_slack_webhook_url_here

# Server
PORT=5000
```

### 4. Start the Server

```bash
cd backend
npm start
```

The server will start on `http://localhost:5000`

## 🧪 Testing the A/B Testing Module

### 1. Test API Endpoints

Run the test script:

```bash
cd backend
node test-abtest.js
```

### 2. Manual Testing with cURL

#### Start an A/B Test

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

#### Update Metrics (Simulated)

```bash
curl -X POST http://localhost:5000/api/abtest/update \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "simulate": true
  }'
```

#### Get Results

```bash
curl http://localhost:5000/api/abtest/result/YOUR_CAMPAIGN_ID
```

### 3. Frontend Integration

Add the A/B testing integration to your frontend:

```html
<!-- Add to your HTML -->
<script src="abtest-integration.js"></script>
<script>
  // Initialize with A/B testing
  const app = new MarketingGPTWithABTest();
</script>
```

## 📊 Database Schema

The A/B testing module uses MongoDB with the following schema:

### Campaign Collection

```javascript
{
  campaign_id: String (unique),
  contentA: String,
  contentB: String,
  metrics: {
    A: { likes, comments, shares, views, clicks },
    B: { likes, comments, shares, views, clicks }
  },
  winner: String ('A', 'B', or null),
  status: String ('active', 'completed', 'cancelled'),
  platform: String,
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

| Method | Endpoint                 | Description               |
| ------ | ------------------------ | ------------------------- |
| POST   | `/api/abtest/start`      | Start new A/B test        |
| POST   | `/api/abtest/update`     | Update engagement metrics |
| GET    | `/api/abtest/result/:id` | Get test results          |
| POST   | `/api/abtest/complete`   | Complete A/B test         |
| GET    | `/api/abtest/campaigns`  | Get all campaigns         |
| GET    | `/api/abtest/statistics` | Get statistics            |
| DELETE | `/api/abtest/:id`        | Delete campaign           |

## 🤖 AI Feedback System

The system automatically generates AI-powered feedback using Cohere AI:

### Features

- Analyzes winning vs losing content
- Identifies key performance factors
- Generates actionable insights
- Provides platform-specific recommendations

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

The system includes intelligent metrics simulation for testing:

### Simulation Factors

- Content length optimization
- Emoji usage impact
- Question engagement
- Call-to-action effectiveness
- Platform-specific patterns

### Platform Multipliers

- Instagram: 1.5x likes, 1.2x comments, 1.3x shares
- Facebook: 1.3x likes, 1.5x comments, 1.4x shares
- Twitter: 1.1x likes, 1.8x comments, 1.6x shares
- LinkedIn: 1.2x likes, 1.3x comments, 1.1x shares
- TikTok: 2.0x likes, 1.4x comments, 1.8x shares
- YouTube: 1.4x likes, 1.6x comments, 1.2x shares

## 🔧 Frontend Integration

### Basic Integration

```javascript
// Initialize A/B testing
const abTest = new ABTestIntegration();

// Start a test
const campaign = await abTest.startCampaign(
  "Content version A",
  "Content version B",
  { platform: "Instagram" }
);

// Simulate metrics
await abTest.updateMetrics(null, null, true);

// Get results
const results = await abTest.getResults();
```

### Advanced Integration

```javascript
// Use the enhanced MarketingGPT class
const app = new MarketingGPTWithABTest();

// A/B testing will be automatically available
// when you generate content
```

## 📊 Google Sheets Integration

Results are automatically saved to Google Sheets:

1. Set up Google Sheets API credentials
2. Add credentials file to `backend/src/credentials.json`
3. Set `GOOGLE_SHEETS_ID` in environment variables
4. Results will be automatically logged

## 🚀 Production Deployment

### 1. Database

- Use MongoDB Atlas for production
- Set up proper indexes
- Configure backup and monitoring

### 2. Security

- Add authentication/authorization
- Validate all input data
- Implement rate limiting
- Use HTTPS

### 3. Monitoring

- Add logging and monitoring
- Set up alerts
- Monitor performance
- Track usage

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**

   - Check MongoDB is running
   - Verify connection string
   - Check firewall settings

2. **API Errors**

   - Check server logs
   - Verify environment variables
   - Test with cURL

3. **AI Feedback Not Working**
   - Check Cohere API key
   - Verify API quota
   - Check network connectivity

### Debug Commands

```bash
# Check MongoDB connection
mongosh "mongodb://localhost:27017/marketing_gpt"

# Test API health
curl http://localhost:5000/api/health

# Check server logs
tail -f backend/logs/app.log
```

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)
- [Cohere AI API](https://docs.cohere.ai/)
- [A/B Testing Best Practices](https://www.optimizely.com/optimization-glossary/ab-testing/)

## 🎯 Next Steps

1. **Set up MongoDB** (local or Atlas)
2. **Configure environment variables**
3. **Start the server**
4. **Run test script**
5. **Integrate with frontend**
6. **Deploy to production**

## 💡 Tips

- Start with simulated metrics for testing
- Use the test script to verify everything works
- Check the API documentation for detailed examples
- Monitor the database for data consistency
- Use the statistics endpoint to track performance

---

**Need Help?** Check the API documentation in `backend/ABTEST_API_DOCS.md` for detailed endpoint information.
