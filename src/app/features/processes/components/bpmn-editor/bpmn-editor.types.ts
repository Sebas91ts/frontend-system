export type LaneValidationResult = {
  valid: boolean;
  missingLaneNames: string[];
  message: string;
};

export type LaneAreaBinding = {
  areaId: string;
  areaName: string;
  matchedByName: boolean;
};

