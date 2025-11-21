# player-profile Specification

## Purpose
TBD - created by archiving change add-roster-profile-links. Update Purpose after archive.
## Requirements
### Requirement: Player public profile view
The system SHALL provide a read-only public profile view for a player at route `/profile/$profileId` that shows non-sensitive, public-safe identity information.

#### Scenario: View existing player profile from direct URL
- **WHEN** a user navigates to `/profile/{profileId}` where a corresponding player profile exists
- **THEN** the system displays the player's username and display name derived from their identity profile
- **AND** the system displays any public-safe fields such as avatar image and barangay when available
- **AND** the system does not show internal-only or sensitive fields beyond what is considered public-safe.

#### Scenario: Player profile not found
- **WHEN** a user navigates to `/profile/{profileId}` where no corresponding player profile exists
- **THEN** the system displays a clear "Profile not found" message.

### Requirement: Roster player profile navigation
The system SHALL allow users to navigate from a player entry in a game roster to that player's public profile.

#### Scenario: Navigate from game roster to player profile
- **WHEN** a user views `/games/{gameId}` with one or more joined players in the roster
- **AND** the user activates a control associated with a particular player's display name
- **THEN** the system navigates to `/profile/{profileId}` for that player
- **AND** the profile view corresponds to the same player whose roster entry was clicked.

