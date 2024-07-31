function dateFromUTC(dateAsString: string) {
  var pattern = new RegExp(
    "(\\d{4})" + "-" + "(\\d{2})" + "-" + "(\\d{2}) (\\d{2}):(\\d{2}):(\\d{2})"
  );
  var parts = dateAsString.match(pattern);

  if (!parts) {
    throw new Error("invalid date");
  }

  return new Date(
    Date.UTC(
      parseInt(parts[1]),
      parseInt(parts[2], 10) - 1,
      parseInt(parts[3], 10),
      parseInt(parts[4], 10),
      parseInt(parts[5], 10),
      parseInt(parts[6], 10),
      0
    )
  );
}

export function convertDbTimestampToDate(
  timestamp: string | null
): Date | null {
  // converts from UTC to local time
  if (!timestamp) {
    return null;
  }
  return dateFromUTC(timestamp);
}

function pluralizeTime(unit: number, singular: string) {
  return `${unit} ${unit === 1 ? singular : singular + "s"} ago`;
}

export function getRelativeDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return pluralizeTime(days, "day");
  }
  if (hours > 0) {
    return pluralizeTime(hours, "hour");
  }
  if (minutes > 0) {
    return pluralizeTime(minutes, "minute");
  }
  return `just now`;
}
