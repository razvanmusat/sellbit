import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { UsersService } from '../api/UsersService';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

export const fetchUsersData = createAsyncThunk(
    'users/fetchUsersData',
    async (_, { rejectWithValue }) => {
        try {
            const [activeUsers, inactiveUsers, roles] = await Promise.all([
                UsersService.getActiveUsers(),
                UsersService.getInactiveUsers(),
                UsersService.getActiveRoles()
            ]);

            return {
                activeUsers: activeUsers || [],
                inactiveUsers: inactiveUsers || [],
                roles: roles || []
            };
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

export const createUser = createAsyncThunk(
    'users/createUser',
    async (payload, { rejectWithValue }) => {
        try {
            return await UsersService.createUser(payload);
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

export const updateUser = createAsyncThunk(
    'users/updateUser',
    async ({ id, payload }, { rejectWithValue }) => {
        try {
            return await UsersService.updateUser(id, payload);
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

export const deactivateUser = createAsyncThunk(
    'users/deactivateUser',
    async (id, { rejectWithValue }) => {
        try {
            return await UsersService.toggleUserStatus(id);
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

export const resetUserPassword = createAsyncThunk(
    'users/resetUserPassword',
    async (id, { rejectWithValue }) => {
        try {
            return await UsersService.resetPassword(id);
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

export const reactivateUser = createAsyncThunk(
    'users/reactivateUser',
    async (id, { rejectWithValue }) => {
        try {
            return await UsersService.reactivateUser(id);
        } catch (error) {
            return rejectWithValue(getFriendlyErrorMessage(error));
        }
    }
);

const initialState = {
    activeUsers: [],
    inactiveUsers: [],
    roles: [],
    loading: false,
    actionLoading: false,
    error: null
};

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        resetUsersState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsersData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchUsersData.fulfilled, (state, action) => {
                state.loading = false;
                state.activeUsers = action.payload.activeUsers;
                state.inactiveUsers = action.payload.inactiveUsers;
                state.roles = action.payload.roles;
            })
            .addCase(fetchUsersData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(createUser.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(createUser.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.activeUsers.push(action.payload);
            })
            .addCase(createUser.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            .addCase(updateUser.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                state.actionLoading = false;
                const updatedUser = action.payload;
                const index = state.activeUsers.findIndex((u) => u.id === updatedUser.id);
                if (index >= 0) {
                    state.activeUsers[index] = updatedUser;
                }
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            .addCase(deactivateUser.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(deactivateUser.fulfilled, (state, action) => {
                state.actionLoading = false;
                const updatedUser = action.payload;
                state.activeUsers = state.activeUsers.filter((u) => u.id !== updatedUser.id);
                state.inactiveUsers.unshift(updatedUser);
            })
            .addCase(deactivateUser.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            .addCase(reactivateUser.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(reactivateUser.fulfilled, (state, action) => {
                state.actionLoading = false;
                const updatedUser = action.payload;
                state.inactiveUsers = state.inactiveUsers.filter((u) => u.id !== updatedUser.id);
                state.activeUsers.unshift(updatedUser);
            })
            .addCase(reactivateUser.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            .addCase(resetUserPassword.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(resetUserPassword.fulfilled, (state) => {
                state.actionLoading = false;
            })
            .addCase(resetUserPassword.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });
    }
});

export const { resetUsersState } = usersSlice.actions;

export const selectUsersState = (state) => state.users;
export const selectActiveUsers = (state) => state.users.activeUsers;
export const selectInactiveUsers = (state) => state.users.inactiveUsers;
export const selectUserRoles = (state) => state.users.roles;

export default usersSlice.reducer;
