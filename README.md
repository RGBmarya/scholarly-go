# Scholarly

A modern research paper discovery app built with React Native and Expo. Browse, bookmark, and chat with research papers from arXiv.

## Features

- **Paper Discovery**: Swipe through research papers with a Tinder-like interface
- **Smart Search**: Search papers with filters and categories
- **Interactive Gestures**: 
  - Swipe right to bookmark
  - Swipe left to chat
  - Double tap to like
  - Swipe up/down to navigate
- **Library Management**: Save and organize papers you're interested in
- **Chat Interface**: Discuss papers with an AI assistant
- **ArXiv Integration**: Real-time paper fetching from arXiv's API

## Tech Stack

- React Native
- Expo Router
- React Native Reanimated
- React Native Gesture Handler
- Zustand (State Management)
- ArXiv API

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- Expo Go app on your mobile device

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/scholarly-go.git
cd scholarly-go
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npx expo start
```

4. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
scholarly-go/
├── app/                    # Main app directory (Expo Router)
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── index.tsx      # Search tab
│   │   ├── explore.tsx    # Paper discovery feed
│   │   └── library.tsx    # Bookmarked papers
│   ├── (chat)/            # Chat interface
│   └── (paper)/           # Paper details
├── components/            # Reusable components
├── services/             # External services (ArXiv API)
├── store/               # State management
└── types/              # TypeScript definitions
```

## Features in Detail

### Paper Discovery Feed
- Gesture-based interaction for intuitive paper browsing
- Real-time paper fetching from arXiv
- Category-based filtering
- Search functionality

### Library Management
- Bookmark papers for later reference
- Remove papers from library
- Quick access to paper details and links

### Chat Interface
- Discuss papers with AI
- Get explanations and insights
- Ask questions about the research

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Acknowledgments

- ArXiv API for providing access to research papers
- Expo team for the amazing development platform
- React Native community for the robust ecosystem
