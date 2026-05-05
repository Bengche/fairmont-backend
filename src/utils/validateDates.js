export const validateBookingDates = (checkIn, checkOut) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return { valid: false, message: "Invalid date format." };
  }

  if (inDate < today) {
    return { valid: false, message: "Check-in date cannot be in the past." };
  }

  if (outDate <= inDate) {
    return {
      valid: false,
      message: "Check-out date must be after check-in date.",
    };
  }

  const nights = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));

  if (nights < 3) {
    return { valid: false, message: "Minimum stay is 3 nights." };
  }

  return { valid: true, nights };
};
