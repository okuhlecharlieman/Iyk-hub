
# Architecture Overview

This document provides an overview of the IYK Hub application architecture, including the main components and data flows.

## High-Level Architecture

The IYK Hub is a modern web application built on a serverless architecture, leveraging Next.js for both the frontend and backend, and Firebase for backend services.

The following diagram illustrates the main containers of the application:

```mermaid
C4Container
  title Container diagram for IYK Hub

  Person(user, "User", "A user of the platform")

  System_Boundary(iyk_hub, "IYK Hub") {
    Container(frontend, "Next.js Frontend", "JavaScript, React", "The client-side application delivering the UI to the user'''s browser.")
    Container(backend, "Next.js Backend", "Node.js", "Handles business logic, API endpoints, and talks to the database.")
    ContainerDb(db, "Firestore", "NoSQL Database", "Stores user data, content, etc.")
    ContainerDb(storage, "Firebase Storage", "File Storage", "Stores user-uploaded files like profile pictures.")
  }

  System_Ext(stripe, "Stripe", "Payment processing")
  System_Ext(paystack, "Paystack", "Payment processing")

  Rel(user, frontend, "Uses", "HTTPS")
  Rel(frontend, backend, "Makes API calls to", "HTTPS")
  Rel(backend, db, "Reads from and writes to")
  Rel(backend, storage, "Reads from and writes to")
  Rel(backend, stripe, "Processes payments via")
  Rel(backend, paystack, "Processes payments via")
```

## Data Flows

To illustrate how data flows through the system, let'''s consider the use case of a user updating their profile.

### Profile Update Sequence Diagram

The following diagram shows the sequence of events when a user updates their profile information, including their profile picture.

```mermaid
sequenceDiagram
    participant User
    participant Browser (Next.js Frontend)
    participant FirebaseStorage as Firebase Storage
    participant NextApi as Next.js API (/api/profile/update)
    participant FirestoreDB as Firestore

    User->>Browser: 1. Edits profile and selects a new photo
    Browser->>FirebaseStorage: 2. Uploads photo directly
    FirebaseStorage-->>Browser: 3. Returns photo URL
    Browser->>NextApi: 4. POST /api/profile/update (with photo URL and other data)
    NextApi->>NextApi: 5. Middleware (Auth, Validation)
    NextApi->>FirestoreDB: 6. Update user document
    FirestoreDB-->>NextApi: 7. Success
    NextApi-->>Browser: 8. Success response
    Browser->>User: 9. Shows success message
```

This data flow is representative of how many features in the application work:

1.  The client-side application (Next.js Frontend) interacts with the user.
2.  For file uploads, the client communicates directly with Firebase Storage to leverage its scalability and security features.
3.  The client then calls the application'''s backend (Next.js API) with the relevant data.
4.  The backend enforces business logic, such as authentication and validation, and then updates the application'''s state in the Firestore database.
