'use strict';

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const SEAT_POOL = ['12A', '12B', '12C', '12D', '14A', '14B', '14C', '14D'];
const passengers = [];

function normalize(value) {
  return String(value).trim().toUpperCase();
}

function isValidPnr(pnr) {
  return /^[A-Z0-9]{5,8}$/.test(normalize(pnr));
}

function isValidIdentityNumber(idNumber) {
  const value = normalize(idNumber);
  return /^\d{12}$/.test(value) || /^[A-Z]\d{7,8}$/.test(value);
}

function isValidFlightNumber(flightNumber) {
  return /^[A-Z]{2}\d{3,4}$/.test(normalize(flightNumber));
}

function findPassengerByPnr(pnr) {
  return passengers.find((passenger) => passenger.pnrCode === normalize(pnr));
}

function findAvailableSeat(flightNumber) {
  const flight = normalize(flightNumber);
  const occupiedSeats = new Set(
    passengers
      .filter((passenger) => passenger.flightNumber === flight && passenger.seatNumber)
      .map((passenger) => passenger.seatNumber),
  );
  return SEAT_POOL.find((seat) => !occupiedSeats.has(seat));
}

function addPassenger(passengerData) {
  const passenger = {
    pnrCode: normalize(passengerData.pnrCode),
    passengerName: String(passengerData.passengerName).trim(),
    idNumber: normalize(passengerData.idNumber),
    flightNumber: normalize(passengerData.flightNumber),
    seatNumber: null,
    isCheckedIn: false,
  };

  if (!isValidPnr(passenger.pnrCode)) {
    throw new Error('PNR phai gom 5-8 chu cai hoac chu so.');
  }
  if (findPassengerByPnr(passenger.pnrCode)) {
    throw new Error('Ma PNR da ton tai.');
  }
  if (!passenger.passengerName) {
    throw new Error('Ten hanh khach khong duoc de trong.');
  }
  if (!isValidIdentityNumber(passenger.idNumber)) {
    throw new Error('CCCD phai co 12 so; ho chieu gom 1 chu cai va 7-8 chu so.');
  }
  if (!isValidFlightNumber(passenger.flightNumber)) {
    throw new Error('So hieu chuyen bay khong hop le (vi du: VN201).');
  }
  passengers.push(passenger);
  return passenger;
}

function checkIn(passenger, idNumber, flightNumber) {
  if (!passenger) throw new Error('Khong tim thay ho so hanh khach.');
  if (passenger.isCheckedIn) throw new Error('Hanh khach da check-in.');
  if (!isValidIdentityNumber(idNumber) || normalize(idNumber) !== passenger.idNumber) {
    throw new Error('Giay to tuy than khong hop le hoac khong khop ho so.');
  }
  if (!isValidFlightNumber(flightNumber) || normalize(flightNumber) !== passenger.flightNumber) {
    throw new Error('So hieu chuyen bay khong hop le hoac khong khop ho so.');
  }

  const seat = findAvailableSeat(passenger.flightNumber);
  if (!seat) throw new Error(`Chuyen bay ${passenger.flightNumber} da het ghe trong khoang.`);
  passenger.seatNumber = seat;
  passenger.isCheckedIn = true;
  return passenger;
}

function displayBoardingPass(passenger) {
  if (!passenger.isCheckedIn || !passenger.seatNumber) {
    throw new Error('Chua the in the: hanh khach chua hoan tat check-in.');
  }
  const border = '='.repeat(52);
  console.log(`\n${border}`);
  console.log('                 BOARDING PASS');
  console.log(border);
  console.log(` PASSENGER : ${passenger.passengerName}`);
  console.log(` PNR       : ${passenger.pnrCode}`);
  console.log(` FLIGHT    : ${passenger.flightNumber}`);
  console.log(` SEAT      : ${passenger.seatNumber}`);
  console.log(` ID        : ${passenger.idNumber}`);
  console.log(` STATUS    : CHECKED IN`);
  console.log(` BARCODE   : *${passenger.pnrCode}-${passenger.flightNumber}*`);
  console.log(border);
}

function listPassengers() {
  if (passengers.length === 0) {
    console.log('Chua co ho so hanh khach.');
    return;
  }
  console.log('\nDANH SACH HO SO HANH KHACH');
  console.log('-'.repeat(92));
  console.log(
    `${'PNR'.padEnd(10)}${'Hanh khach'.padEnd(24)}${'Giay to'.padEnd(18)}${'Chuyen bay'.padEnd(14)}${'Ghe'.padEnd(8)}Trang thai`,
  );
  console.log('-'.repeat(92));
  for (const passenger of passengers) {
    console.log(
      `${passenger.pnrCode.padEnd(10)}${passenger.passengerName.padEnd(24)}${passenger.idNumber.padEnd(18)}${passenger.flightNumber.padEnd(14)}${(passenger.seatNumber || '-').padEnd(8)}${passenger.isCheckedIn ? 'CHECKED_IN' : 'PENDING'}`,
    );
  }
}

async function askNonEmpty(rl, prompt) {
  while (true) {
    const value = (await rl.question(prompt)).trim();
    if (value) return value;
    console.log('Thong tin khong duoc de trong.');
  }
}

async function addPassengerFromInput(rl) {
  const passengerData = {
    pnrCode: await askNonEmpty(rl, 'Ma PNR: '),
    passengerName: await askNonEmpty(rl, 'Ho ten hanh khach: '),
    idNumber: await askNonEmpty(rl, 'CCCD/ho chieu: '),
    flightNumber: await askNonEmpty(rl, 'So hieu chuyen bay (vi du VN201): '),
  };
  try {
    const passenger = addPassenger(passengerData);
    console.log(`Da tao ho so ${passenger.pnrCode}. Hanh khach se duoc cap ghe khi check-in.`);
  } catch (error) {
    console.log(error.message);
  }
}

async function checkInFromInput(rl) {
  const pnr = await askNonEmpty(rl, 'Ma PNR: ');
  const idNumber = await askNonEmpty(rl, 'CCCD/ho chieu de doi chieu: ');
  const flightNumber = await askNonEmpty(rl, 'So hieu chuyen bay: ');
  try {
    const passenger = checkIn(findPassengerByPnr(pnr), idNumber, flightNumber);
    console.log('Xac thuc giay to va chuyen bay thanh cong.');
    console.log(`Da cap ghe ${passenger.seatNumber}.`);
    displayBoardingPass(passenger);
  } catch (error) {
    console.log(error.message);
  }
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  let menuChoice;
  try {
    do {
      console.log('\n=== HO SO HANH KHACH & CHECK-IN ===');
      console.log('1. Tiep nhan ho so hanh khach');
      console.log('2. Xac thuc va check-in');
      console.log('3. Hien thi danh sach ho so');
      console.log('4. Thoat');
      menuChoice = (await rl.question('Chon chuc nang (1-4): ')).trim();

      switch (menuChoice) {
        case '1':
          await addPassengerFromInput(rl);
          break;
        case '2':
          await checkInFromInput(rl);
          break;
        case '3':
          listPassengers();
          break;
        case '4':
          console.log('Da thoat chuong trinh.');
          break;
        default:
          console.log('Lua chon khong hop le. Vui long chon tu 1 den 4.');
      }
    } while (menuChoice !== '4');
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Loi chuong trinh:', error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  passengers,
  isValidPnr,
  isValidIdentityNumber,
  isValidFlightNumber,
  findPassengerByPnr,
  findAvailableSeat,
  addPassenger,
  checkIn,
  displayBoardingPass,
  main,
};
