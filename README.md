# NASA Image Explorer

A revolutionary MERN stack platform for exploring NASA's massive image datasets with AI-powered search, interactive annotations, and seamless navigation through space imagery.

## 🚀 Features

### Core Functionality
- **AI-Powered Search**: Find images using natural language descriptions, coordinates, or visual features
- **Interactive Annotations**: Label and annotate features with collaborative tools
- **Time Series Analysis**: Compare images taken at different times
- **Multi-Planet Exploration**: Explore Earth, Mars, the Moon, and distant galaxies
- **Precision Zoom**: Navigate gigapixel images with smooth rendering
- **Collaborative Research**: Share discoveries with the scientific community

### Technical Features
- **Advanced Image Viewer**: Built with OpenSeadragon for high-performance zoom/pan
- **Real-time Collaboration**: Socket.io for live annotation sharing
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Modern UI/UX**: Framer Motion animations and styled-components
- **Scalable Architecture**: MERN stack with MongoDB, Express.js, React, and Node.js

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time features
- **Sharp** for image processing
- **JWT** for authentication
- **Helmet** for security

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **TanStack Query** for data fetching
- **Styled Components** for styling
- **Framer Motion** for animations
- **OpenSeadragon** for image viewing
- **React Leaflet** for maps
- **Recharts** for data visualization

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### Backend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/nasa-explorer
   CLIENT_URL=http://localhost:3000
   JWT_SECRET=your_jwt_secret_key_here
   NASA_API_KEY=your_nasa_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

#### Map Basemap
The client now uses NASA GIBS WMTS satellite imagery (no API key required). The app uses OpenStreetMap Nominatim for geocoding.

No Google Maps or Bing Maps API keys are required.
```
VITE_GOOGLE_MAPS_KEY=your_google_maps_js_api_key
```
```

Restart the client/server after setting env vars. If keys are not provided the app falls back to OpenStreetMap (OSM) data and imagery.

## 🗄️ Database Schema

### Images Collection
```javascript
{
  title: String,
  description: String,
  source: String, // hubble, mars_reconnaissance, etc.
  mission: String,
  date: Date,
  coordinates: {
    lat: Number,
    lng: Number,
    zoom: Number
  },
  dimensions: {
    width: Number,
    height: Number,
    pixelCount: Number
  },
  imageUrl: String,
  thumbnailUrl: String,
  tileUrl: String,
  metadata: Object,
  tags: [String],
  annotations: [ObjectId],
  views: Number
}
```

### Annotations Collection
```javascript
{
  imageId: ObjectId,
  type: String, // point, polygon, rectangle, etc.
  coordinates: Object,
  label: String,
  description: String,
  category: String, // geological, atmospheric, etc.
  confidence: Number,
  verified: Boolean,
  createdBy: ObjectId,
  tags: [String]
}
```

## 🔌 API Endpoints

### Images
- `GET /api/images` - Get all images with pagination
- `GET /api/images/:id` - Get single image
- `GET /api/images/:id/tiles/:z/:x/:y` - Get image tiles
- `POST /api/images` - Create new image
- `PUT /api/images/:id` - Update image
- `DELETE /api/images/:id` - Delete image

### Annotations
- `GET /api/annotations/image/:imageId` - Get annotations for image
- `GET /api/annotations/:id` - Get single annotation
- `POST /api/annotations` - Create annotation
- `PUT /api/annotations/:id` - Update annotation
- `PATCH /api/annotations/:id/verify` - Verify annotation
- `DELETE /api/annotations/:id` - Delete annotation

### Search
- `POST /api/search/semantic` - AI-powered semantic search
- `GET /api/search/coordinates` - Coordinate-based search
- `GET /api/search/features` - Feature-based search
- `GET /api/search/timeseries` - Time series search
- `POST /api/search/advanced` - Advanced search with multiple criteria

### Datasets
- `GET /api/datasets` - Get available datasets
- `GET /api/datasets/:source/:mission` - Get dataset details
- `POST /api/datasets/import` - Import data from NASA APIs
- `GET /api/datasets/stats/overview` - Get dataset statistics

## 🎨 Key Components

### Frontend Components
- **OpenSeadragonViewer**: High-performance image viewer
- **AnnotationPanel**: Interactive annotation management
- **AnnotationToolbar**: Toolbar for annotation tools
- **SearchInterface**: Advanced search with filters
- **DatasetExplorer**: Browse and explore datasets

### Backend Services
- **Image Processing**: Sharp for image optimization
- **Real-time Collaboration**: Socket.io integration
- **AI Search**: Integration with OpenAI API
- **Data Management**: MongoDB with optimized queries

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_production_mongodb_uri
CLIENT_URL=your_production_client_url
JWT_SECRET=your_production_jwt_secret
NASA_API_KEY=your_nasa_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- NASA for providing the incredible space imagery
- OpenSeadragon for the powerful image viewer
- The open-source community for the amazing tools and libraries
- All contributors and researchers who make space exploration accessible

## 📞 Support

For support, email support@nasa-explorer.com or join our Discord community.

---

**Built with ❤️ for the future of space exploration**


