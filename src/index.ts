export default function getRoomName() {
  const atSymbol = document.URL.lastIndexOf("/@")
  if (atSymbol < 0) {
    return "default";
  }
  let ROOM_ID = document.URL.substring(atSymbol + 2);
  if (ROOM_ID.indexOf("?") >= 0) {
      ROOM_ID = ROOM_ID.substring(0, ROOM_ID.indexOf("?"));
  }
  return ROOM_ID;
}
