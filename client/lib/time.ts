export function formatGameTime(dateTime: string | number | Date, span: number | string) {
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
  const startHour24 = date.getHours();
  const duration = Number(span) || 0;
  const endHour24 = (startHour24 + duration) % 24;

  const formatHour = (h: number) => {
    const hour12 = h % 12 === 0 ? 12 : (h % 12);
    return `${hour12}`;
  };

  return `${formatHour(startHour24)}-${formatHour(endHour24)}`;
}

export function formatGameDate(dateTime: string | number | Date) {
  const date = new Date(dateTime);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${weekday}, ${month}-${day}`;
}