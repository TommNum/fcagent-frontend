# Backend API Requirements for Frontend Integration

This document outlines the necessary backend API changes or considerations required to fully support the current state and features of the `fcagent-frontend` application.

## 1. Ticket / Contact Linking

**Requirement:** Allow associating a user's email address or Telegram ID with an existing support request (`ticketId`).

**Current Status:** The frontend currently collects this information via a prompt after a `ticketId` is generated. However, the Orchestrator API (`orchestrator_service/main.py` and `models.py`) **lacks an endpoint** to update an existing `SupportRequest` with this contact information *after* initial creation.

**Proposed Solutions (Choose one):**

*   **Option A (Recommended): Modify Existing Update Endpoint**
    1.  Add optional `linked_email: Optional[str]` and `linked_telegram_id: Optional[str]` fields to the `SupportRequestUpdate` Pydantic model in `orchestrator_service/models.py`.
    2.  Modify the `PUT /requests/{request_id}` endpoint logic in `orchestrator_service/main.py` to accept these new fields and update the corresponding `SupportRequest` record in the database. Ensure appropriate validation.
*   **Option B: Create New Dedicated Endpoint**
    1.  Create a new endpoint, e.g., `POST /requests/{request_id}/link-contact`.
    2.  Define a Pydantic model for the request body, e.g., `LinkContactRequest(type: Literal['email', 'telegram'], identifier: str)`.
    3.  Implement the endpoint logic to find the `SupportRequest` and update a relevant field (e.g., add to `request_metadata` or dedicated columns if added to the DB model).

**Frontend Implementation:** The frontend's `handleLinkTicket` function will need to be updated to call the chosen backend endpoint (either `PUT /requests/{request_id}` or the new endpoint) instead of the current mock.

## 2. Agent Name in Message Response

**Requirement:** Provide the name of the agent who generated a reply message.

**Current Status:** The frontend's `fetchAgentReply` function currently polls `GET /requests/{ticketId}/messages` after sending a user message. The `SupportMessageResponse` model in `models.py` includes `sender_type` and `sender_id` but not explicitly the `agentName`. The frontend then separately calls `GET /requests/{ticketId}` to get the `assigned_agent` for the *request*, which might not be the *specific* agent who sent the last message, especially if handoffs occur.

**Proposed Solutions:**

*   **Option A: Add Agent Name to Message Metadata:** When the backend creates an agent message (`SupportMessage` record), include the agent's name (e.g., `TriageAgent`, `APIImplementationAgent`) in the `request_metadata` field of the message.
*   **Option B: Modify Message Model:** Add an `agent_name: Optional[str]` field to the `SupportMessageResponse` Pydantic model and populate it when returning agent messages.

**Frontend Implementation:** Update the mapping logic within `fetchAgentReply` to extract the `agentName` from the chosen location (metadata or new field) in the message response.

## 3. Real-time Agent Replies (Optional Enhancement)

**Requirement:** Push agent replies to the frontend in real-time instead of relying on frontend polling.

**Current Status:** The frontend uses `setTimeout` and polling (`fetchAgentReply`) to check for new agent messages.

**Proposed Solutions:**

*   Implement **WebSockets** or **Server-Sent Events (SSE)** in the backend (likely Orchestrator or API Gateway).
*   When an agent generates a reply (potentially in the background task), push the new message data through the established WebSocket/SSE connection to the relevant frontend client (identified perhaps by `ticketId` or `guestUserId`).

**Frontend Implementation:** Update the frontend to establish a WebSocket/SSE connection and listen for incoming agent messages, adding them directly to the state instead of polling.

## 4. User Authentication / User ID Handling

**Requirement:** Handle user identification beyond the temporary guest ID.

**Current Status:** The frontend generates a temporary `guestUserId` stored in `localStorage`. This ID is passed in the `metadata` of the initial `POST /requests` and as `sender_id` in `POST /requests/{ticketId}/messages`. The `user_id` field in `POST /requests` is currently hardcoded to `0` as a placeholder.

**Proposed Solutions:**

*   Implement a proper authentication flow (e.g., using the `auth_service`).
*   Once authenticated, the frontend should send the actual user's ID (obtained from the auth service/token) instead of the guest ID or the placeholder `0`.
*   The backend should use this authenticated `user_id` when creating/querying requests and messages.

**Frontend Implementation:** Integrate with the authentication flow, store user session/token, and use the real `user_id` in API calls. 