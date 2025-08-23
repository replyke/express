import { IProjectKeys } from "./IProjectKeys";

export default interface IProject {
  id: string;
  name: string;
  keys: IProjectKeys; // TODO: Change to array of more flexible key object?
}
