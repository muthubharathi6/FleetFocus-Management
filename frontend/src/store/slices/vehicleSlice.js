import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import vehicleService from '../../services/vehicleService';
import { clearAuthStorage } from '../../services/api';

/*
 * Fetch all vehicles with pagination
 */
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchAll',
  async (
    { page = 0, size = 10 } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await vehicleService.getAll(
        page,
        size
      );

      return response.data;
    } catch (err) {
      /*
       * T20:
       * When the backend returns 401, remove stale
       * authentication information immediately.
       *
       * This is also important during Jest because the
       * mocked Axios interceptor does not execute the
       * response interceptor callback.
       */
      if (err?.response?.status === 401) {
        clearAuthStorage();
      }

      return rejectWithValue(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load vehicles.'
      );
    }
  }
);

/*
 * Delete vehicle
 */
export const deleteVehicle = createAsyncThunk(
  'vehicles/delete',

  async (id, { rejectWithValue }) => {
    try {
      await vehicleService.delete(id);

      return id;
    } catch (err) {
      /*
       * Also clear stale authentication if DELETE
       * receives a 401 response.
       */
      if (err?.response?.status === 401) {
        clearAuthStorage();
      }

      return rejectWithValue(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to delete vehicle.'
      );
    }
  }
);

const initialState = {
  items: [],

  pagination: {
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 10,
  },

  loading: false,
  error: null,
};

const vehicleSlice = createSlice({
  name: 'vehicles',

  initialState,

  reducers: {
    clearVehicleError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder

      /*
       * Fetch vehicles - pending
       */
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      /*
       * Fetch vehicles - success
       */
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const data = action.payload || {};

        state.items = Array.isArray(data.content)
          ? data.content
          : Array.isArray(data)
            ? data
            : [];

        state.pagination = {
          currentPage: data.number ?? 0,
          totalPages: data.totalPages ?? 0,
          totalElements: data.totalElements ?? 0,
          pageSize: data.size ?? 10,
        };
      })

      /*
       * Fetch vehicles - failed
       */
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;

        state.error =
          action.payload ||
          action.error?.message ||
          'Failed to load vehicles.';
      })

      /*
       * Delete vehicle - pending
       */
      .addCase(deleteVehicle.pending, (state) => {
        state.error = null;
      })

      /*
       * Delete vehicle - success
       */
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.error = null;

        state.items = state.items.filter(
          (vehicle) =>
            vehicle.id !== action.payload
        );

        if (state.pagination.totalElements > 0) {
          state.pagination.totalElements -= 1;
        }
      })

      /*
       * Delete vehicle - failed
       */
      .addCase(deleteVehicle.rejected, (state, action) => {
        state.error =
          action.payload ||
          action.error?.message ||
          'Failed to delete vehicle.';
      });
  },
});

export const {
  clearVehicleError,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;