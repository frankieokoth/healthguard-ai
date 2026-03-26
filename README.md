# HealthGuard AI

HealthGuard AI is a dual-portal health management and surveillance system designed for the specific needs of regional health departments. It bridges the gap between frontline Community Health Volunteers (CHVs) and District Health Officers to improve patient outcomes and outbreak response.

## 🚀 Key Features

### 🏥 CHV Portal (Frontline Care)
- **Patient Management**: Real-time registration and tracking of community members.
- **AI Diagnostic Engine**: Symptom-based diagnostic support powered by Gemini 3 Flash.
- **Malnutrition Vision Scan**: Computer vision analysis of MUAC (Mid-Upper Arm Circumference) and physical signs to detect malnutrition in children.
- **Offline Resilience**: Designed to handle intermittent connectivity typical in rural areas.

### 📊 District Dashboard (Surveillance)
- **Outbreak Surveillance**: Real-time mapping of disease clusters (e.g., Malaria, Cholera).
- **Health Statistics**: Aggregated data on active alerts, critical cases, and regional health trends.
- **Alert System**: Automated identification of potential outbreaks based on CHV diagnostic reports.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS (Utility-first design)
- **Animations**: Framer Motion / Motion
- **Backend**: Firebase (Firestore, Authentication)
- **AI/ML**: Google Gemini 3 Flash (via `@google/genai`)
- **Data Visualization**: Recharts, D3.js

## ⚙️ Setup & Configuration

### Environment Variables
Create a `.env` file (based on `.env.example`) with the following:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Firebase Integration
The project uses Firebase for real-time data synchronization. Ensure `firebase-applet-config.json` is populated with your project credentials:
- `apiKey`
- `authDomain`
- `projectId`
- `appId`
- `firestoreDatabaseId`

### Installation
```bash
npm install
npm run dev
```

## 🏗 Architecture

### Data Flow
1. **CHVs** input patient data and symptoms in the field.
2. **Gemini AI** processes symptoms and returns a severity-ranked diagnosis.
3. **Firestore** stores records and triggers real-time updates to the **District Dashboard**.
4. **District Officers** monitor the dashboard for anomalies and coordinate responses.

### Security
- **Firestore Rules**: Implemented with strict "Default Deny" principles.
- **RBAC**: Role-based access control ensuring CHVs only access their assigned patients and District Officers see anonymized aggregate data.

## 🎨 Design Philosophy
The application follows a **Technical Dashboard** aesthetic:
- **Precision**: Monospace fonts for data values.
- **Clarity**: High-contrast typography and clear visual hierarchy.
- **Responsiveness**: Mobile-first design for CHVs in the field, expanded grid layouts for desktop-based District Officers.

## 🛡 License
Proprietary - Developed for Regional Health Departments.
