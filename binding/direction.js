const Direction = {
  FORWARD: "f",
  BACKWARD: "b",
  DOWNWARD: "d",
  UPWARD: "u",
  INWARD: "i",
  OUTWARD: "o",
};

const Alignment = {
  NULL: "NULL",
  NONE: "NONE",
  NEGATIVE: "NEGATIVE",
  CENTER: "CENTER",
  POSITIVE: "POSITIVE",
  // Used to align inward nodes.
  INWARD_HORIZONTAL: "INWARD_HORIZONTAL",
  INWARD_VERTICAL: "INWARD_VERTICAL",
};

function readAlignment(given) {
  if (typeof given === "number") {
    return given;
  }
  if (typeof given === "string") {
    given = given.toLowerCase();
    switch (given) {
      case "none":
      case "no":
        return Alignment.NONE;
      case "negative":
      case "neg":
      case "n":
        return Alignment.NEGATIVE;
      case "positive":
      case "pos":
      case "p":
        return Alignment.POSITIVE;
      case "center":
      case "c":
        return Alignment.CENTER;
      case "vertical":
      case "v":
        return Alignment.INWARD_VERTICAL;
      case "horizontal":
      case "h":
        return Alignment.INWARD_HORIZONTAL;
    }
  }

  return Alignment.NULL;
}

const Axis = {
  VERTICAL: "VERTICAL",
  HORIZONTAL: "HORIZONTAL",
  Z: "Z",
};

const PreferredAxis = {
  NULL: "NULL",
  PERPENDICULAR: "PERPENDICULAR",
  PARENT: "PARENT",
  VERTICAL: "VERTICAL",
  HORIZONTAL: "HORIZONTAL",
};

const readDirection = (dir) => {
  return dir.toLowerCase().substring(0, 1);
};

const reverseDirection = (dir) => {
  switch (dir) {
    case "d":
      return "u";
    case "u":
      return "d";
    case "f":
      return "b";
    case "b":
      return "f";
    case "i":
      return "o";
    case "o":
      return "i";
  }
};

const nameDirection = (given) => {
  switch (given) {
    case Direction.NULL:
      return "NULL";
    case Direction.FORWARD:
      return "FORWARD";
    case Direction.BACKWARD:
      return "BACKWARD";
    case Direction.DOWNWARD:
      return "DOWNWARD";
    case Direction.UPWARD:
      return "UPWARD";
    case Direction.INWARD:
      return "INWARD";
    case Direction.OUTWARD:
      return "OUTWARD";
  }
}

const getDirectionAxis = (given) => {
  switch (given) {
    case Direction.FORWARD:
    case Direction.BACKWARD:
      return Axis.HORIZONTAL;
    case Direction.DOWNWARD:
    case Direction.UPWARD:
      return Axis.VERTICAL;
    case Direction.INWARD:
    case Direction.OUTWARD:
      return Axis.Z;
    case Direction.NULL:
      return Axis.NULL;
  }
};

const isVerticalDirection = (dir) => {
  switch (dir) {
    case "d":
    case "u":
      return true;
    default:
      return false;
  }
};

const isHorizontalDirection = (dir) => {
  switch (dir) {
    case "d":
    case "u":
      return true;
    default:
      return false;
  }
};

const getPerpendicularAxis = (axisOrDirection) => {
  switch (axisOrDirection) {
    case Axis.HORIZONTAL:
      return Axis.VERTICAL;
    case Axis.VERTICAL:
      return Axis.HORIZONTAL;
    case Axis.Z:
      return Axis.Z;
    case Axis.NULL:
      return Axis.NULL;
    default:
      // Assume it's a direction.
      return getPerpendicularAxis(getDirectionAxis(axisOrDirection));
  }
};

const getPositiveDirection = (given) => {
  switch (given) {
    case Axis.HORIZONTAL:
      return Direction.FORWARD;
    case Axis.VERTICAL:
      return Direction.DOWNWARD;
    case Axis.Z:
      return Direction.OUTWARD;
    case Axis.NULL:
      throw new Error("BAD AXIS");
  }
};

const getNegativeDirection = (given) => {
  return reverseDirection(getPositiveDirection(given));
};

const isPositiveDirection = (given) => {
  const positiveDirection = getPositiveDirection(getDirectionAxis(given));
  return given === positiveDirection;
};

const isNegativeDirection = (given) => {
  return isPositiveDirection(reverseDirection(given));
};

const directionSign = (given) => {
  return isPositiveDirection(given) ? 1 : -1;
};

function turnLeft(given) {
  switch (given) {
    case Direction.FORWARD:
      return Direction.UPWARD;
    case Direction.BACKWARD:
      return Direction.DOWNWARD;
    case Direction.DOWNWARD:
      return Direction.FORWARD;
    case Direction.UPWARD:
      return Direction.BACKWARD;
    default:
      throw createException(BAD_NODE_DIRECTION);
  }
}

function turnRight(given) {
  return reverseDirection(turnLeft(given));
}

function turnPositive(direction) {
  return getPositiveDirection(getPerpendicularAxis(direction));
}

function turnNegative(direction) {
  return reverseDirection(turnPositive(direction));
}

const SHRINK_SCALE = 0.85;

module.exports = {
  Alignment,
  SHRINK_SCALE,
  Direction,
  Axis,
  PreferredAxis,
  readDirection,
  reverseDirection,
  getDirectionAxis,
  isHorizontalDirection,
  isVerticalDirection,
  turnLeft,
  turnRight,
  turnPositive,
  turnNegative,
  readAlignment,
  getPositiveDirection,
  getNegativeDirection,
  isPositiveDirection,
  isNegativeDirection,
  directionSign,
  nameDirection
};
