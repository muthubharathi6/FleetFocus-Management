import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

/*
 * Restore authenticated user from localStorage
 * when the application starts.
 */
const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse stored user:', error);

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');

    return null;
  }
};

const storedUser = getStoredUser();

/*
 * Login
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await authService.login(credentials);

      return data;
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message ||
          err?.message ||
          'Login failed'
      );
    }
  }
);

/*
 * Authentication Slice
 */
const authSlice = createSlice({
  name: 'auth',

  initialState: {
    user: storedUser,
    loading: false,
    error: null,
  },

  reducers: {
    /*
     * Logout
     */
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;

      authService.logout();
    },
  },

  extraReducers: (builder) => {
    builder

      /*
       * Login started
       */
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      /*
       * Login successful
       */
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        /*
         * T29 expects the complete backend payload
         * to become auth.user.
         */
        state.user = action.payload;
      })

      /*
       * Login failed
       */
      .addCase(login.rejected, (state, action) => {
        state.loading = false;

        state.error =
          action.payload ||
          action.error?.message ||
          'Login failed';

        state.user = null;
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;