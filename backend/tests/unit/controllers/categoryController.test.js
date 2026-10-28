const Category = require('../../../src/models/Category');
const { getCategories } = require('../../../src/controllers/categoryController');

jest.mock('../../../src/models/Category', () => ({ find: jest.fn() }));

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('getCategories', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns all categories sorted by name', async () => {
    // Arrange
    const categories = [{ name: 'Laptops' }, { name: 'Phones' }];
    const sort = jest.fn().mockResolvedValue(categories);
    Category.find.mockReturnValue({ sort });
    const res = mockResponse();

    // Act
    await getCategories({}, res);

    // Assert
    expect(sort).toHaveBeenCalledWith({ name: 1 });
    expect(res.json).toHaveBeenCalledWith(categories);
  });

  test('returns empty list when there are no categories', async () => {
    // Arrange
    Category.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = mockResponse();

    // Act
    await getCategories({}, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test('propagates database errors', async () => {
    // Arrange
    Category.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('connection lost')),
    });

    // Act + Assert
    await expect(getCategories({}, mockResponse())).rejects.toThrow(
      'connection lost'
    );
  });
});
