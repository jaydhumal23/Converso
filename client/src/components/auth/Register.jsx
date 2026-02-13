


import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const Register = ({ onLoginClick }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-tx mb-1">Create Account</h2>
          <p className="text-tx-secondary text-sm">Join the community</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-tx-secondary mb-2 text-sm font-medium">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition-all"
              placeholder="jay"
            />
          </div>

          <div>
            <label className="block text-tx-secondary mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition-all"
              placeholder="jay@me.com"
            />
          </div>

          <div className="relative">
            <label className="block text-tx-secondary mb-2 text-sm font-medium">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="w-full px-4 py-3 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition-all pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 pt-7 cursor-pointer text-tx-muted hover:text-tx-secondary focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent cursor-pointer text-bg py-3 rounded-lg font-medium hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-bg"></div>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-tx-muted text-center mt-6 text-sm">
          Already have an account?{' '}
          <button
            onClick={onLoginClick}
            className="text-tx cursor-pointer hover:underline font-medium transition-colors"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
