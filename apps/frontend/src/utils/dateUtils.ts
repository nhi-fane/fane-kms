export function getStandardHours(
  start: Date, 
  end: Date, 
  staffLeaves: { leaveDate: string | Date, duration: number, status: string }[], 
  holidays: { startDate: string | Date, endDate: string | Date }[],
  standardHoursPerDay: number = 8
): number {
  let standardHours = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endLimit = new Date(end);
  endLimit.setHours(23, 59, 59, 999);

  while (current <= endLimit) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Not weekend
      // check holiday
      const isHoliday = holidays.some(h => {
        const hs = new Date(h.startDate); hs.setHours(0,0,0,0);
        const he = new Date(h.endDate); he.setHours(23,59,59,999);
        return current >= hs && current <= he;
      });
      
      if (!isHoliday) {
        // check leave
        const leave = staffLeaves.find(l => {
          const ld = new Date(l.leaveDate); ld.setHours(0,0,0,0);
          return ld.getTime() === current.getTime() && l.status === 'Approved';
        });
        
        if (leave) {
          standardHours += standardHoursPerDay * (1 - leave.duration); 
        } else {
          standardHours += standardHoursPerDay;
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return standardHours;
}
