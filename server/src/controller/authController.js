import jwt from 'jsonwebtoken';
import User from '../modals/User.js';

// Generate JWT token with 1-hour lifespan
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'ayush_rider_portal_jwt_secret_key_2026_secure',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    }
  );
};

// @desc    Admin login
// @route   POST /api/auth/login
// @access  Public
export const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide both email and password.');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password.');
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found.');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found.');
    }

    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.email) user.email = req.body.email.toLowerCase().trim();
    if (req.body.avatar) user.avatar = req.body.avatar.trim();

    if (req.body.password && req.body.password.trim().length >= 6) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile photo (saved in server/uploads/)
// @route   POST /api/auth/upload-avatar
// @access  Private
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No image file uploaded.');
    }

    // Construct accessible image URL
    const protocol = req.protocol;
    const host = req.get('host');
    const avatarUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    // Update user's avatar in database
    const user = await User.findById(req.user._id);
    if (user) {
      user.avatar = avatarUrl;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Photo uploaded and saved successfully',
      avatarUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    next(error);
  }
};
