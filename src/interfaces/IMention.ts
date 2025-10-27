export default interface IMention {
  id: string; // User ID of the mentioned user
  foreignId?: string | null; // User foreign ID of the mentioned user
  username: string; // Current username for easy lookup
}
