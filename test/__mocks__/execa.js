// Mock execa to avoid actual process execution
const mockProcess = {
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
  stdin: { write: jest.fn(), destroyed: false },
  on: jest.fn(),
  kill: jest.fn(),
  killed: false
};

const execa = jest.fn().mockImplementation(() => mockProcess);
execa.mockResolvedValue = jest.fn().mockImplementation((value) => {
  execa.mockImplementation(() => value);
  return execa;
});

module.exports = { execa };