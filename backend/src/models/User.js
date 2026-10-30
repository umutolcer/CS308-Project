const mongoose = require('mongoose');

// Allowed roles for the store. New accounts are always created as customers;
// the other roles are assigned manually for staff accounts.
const ROLES = ['customer', 'sales_manager', 'product_manager', 'support_agent'];

const userSchema = new mongoose.Schema({
    // MongoDB creates the user's `_id` automatically.

    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },

    email: {
        type: String,
        required: [true, 'Email is required'],

        // `unique` creates a MongoDB unique index. It is not a normal Mongoose
        // validator, so duplicate emails are also checked in the register logic.
        unique: true,

        // Normalize so "User@Mail.com " and "user@mail.com" are the same account.
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email is not valid'],
    },

    homeAddress: {
        type: String,
        required: [true, 'Home address is required'],
        trim: true,
    },

    // Only the bcrypt hash is stored, never the plain password.
    passwordHash: {
        type: String,
        required: [true, 'Password hash is required'],
    },

    role: {
        type: String,
        enum: {
            values: ROLES,
            message: 'Role must be one of: ' + ROLES.join(', '),
        },
        default: 'customer',
    },
});

// Never send the password hash to the client when a user is returned as JSON.
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
