import { calculatorApi, itemsApi } from '../services/api';
import axios from 'axios';

jest.mock('axios', () => {
  const post = jest.fn();
  const get = jest.fn();
  return {
    __esModule: true,
    default: { create: jest.fn(() => ({ post, get })) },
    post,
    get,
  };
});

const mockedAxios: any = axios as any;

beforeEach(() => {
  mockedAxios.post.mockReset && mockedAxios.post.mockReset();
  mockedAxios.get.mockReset && mockedAxios.get.mockReset();
});

describe('API wrapper error handling', () => {
  it('returns structured error from calculateDps', async () => {
    mockedAxios.post.mockRejectedValueOnce({ message: 'fail', response: { status: 500 } });
    await expect(calculatorApi.calculateDps({} as any)).rejects.toEqual({ message: 'fail', status: 500 });
  });

  it('returns structured error from getItemById', async () => {
    mockedAxios.get.mockRejectedValueOnce({ message: 'not found', response: { status: 404 } });
    await expect(itemsApi.getItemById(1)).rejects.toEqual({ message: 'not found', status: 404 });
  });
});
