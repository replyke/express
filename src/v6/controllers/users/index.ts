import fetchUser from "./fetchUser";
import fetchUserByForeignId from "./fetchUserByForeignId";
import fetchUserSuggestions from "./fetchUserSuggestions";
import checkUsernameAvailability from "./checkUsernameAvailability";
import updateUser from "./updateUser";

import {
  createFollow,
  deleteFollowByUserId,
  fetchFollowStatus,
  fetchFollowersByUserId,
  fetchFollowersCountByUserId,
  fetchFollowingByUserId,
  fetchFollowingCountByUserId,
} from "./follows";

import {
  requestConnection,
  fetchConnectionStatus,
  removeConnectionByUserId,
  fetchConnectionsByUserId,
  fetchConnectionsCountByUserId,
} from "./connections";

export {
  fetchUser,
  fetchUserByForeignId,
  fetchUserSuggestions,
  checkUsernameAvailability,
  updateUser,

  // Follow controllers
  createFollow,
  deleteFollowByUserId,
  fetchFollowStatus,
  fetchFollowersByUserId,
  fetchFollowersCountByUserId,
  fetchFollowingByUserId,
  fetchFollowingCountByUserId,

  // Connection controllers
  requestConnection,
  fetchConnectionStatus,
  removeConnectionByUserId,
  fetchConnectionsByUserId,
  fetchConnectionsCountByUserId,
};
