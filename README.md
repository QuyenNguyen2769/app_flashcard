# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## AI vocabulary generation

For Google Gemini, set these values in `.env` at the project root:

```env
EXPO_PUBLIC_LLM_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent
EXPO_PUBLIC_LLM_API_KEY=your_Gemini_API_key
EXPO_PUBLIC_LLM_MODELS=gemini-3.5-flash-lite,gemini-3.8-flash
```

Create the key in [Google AI Studio](https://aistudio.google.com/apikey); a key
for a different Google service is not interchangeable.
The app supports Gemini's native `generateContent` endpoint and its
OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`).
For another provider, use that provider's full OpenAI-compatible
chat-completions URL and a model available to the API key. After changing
`.env`, stop and restart Expo (for example, `npx expo start -c`) so the new
values are loaded. A `{model}` placeholder in a Gemini `generateContent` URL
is replaced with the current model. `EXPO_PUBLIC_LLM_MODELS` is tried in order;
if it is not set, the app uses the legacy `EXPO_PUBLIC_LLM_MODEL` value (or the
provider default). Each request has a 30-second timeout. HTTP 503 and 429
responses are retried once after a short delay before trying the next model;
timeouts skip same-model retries and immediately try the next model. Other
HTTP errors fail immediately. Gemini requests use JSON schema output, and
requests for more than 10 words are split into two parallel batches. Successful
results are cached in memory for the current app session.
For single-card suggestions, the app also looks up IPA and definition context
from dictionaryapi.dev; if that reference is unavailable, it falls back to the
AI-generated pronunciation. Generated meanings and examples can still require
human review; AI output cannot be guaranteed to be 99% accurate.

The app shows configuration and request errors beside the AI button. If a
provider request fails with a network error in the web app, the provider may
not allow browser requests (CORS); use a server-side proxy in that case.
`EXPO_PUBLIC_*` values are embedded in the client app and are visible to users,
so do not put a production/private API key in these variables. A production
deployment should call a server-side proxy instead.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
