import { useState, useEffect } from 'react';
import { useApi } from '../api/client.js';

const TIER_INFO = {
  free: { name: 'Free', price: 0, color: '#94a3b8' },
  pro: { name: 'Pro', price: 5, color: '#2563eb' },
  team: { name: 'Team', price: 49, color: '#10b981' },
  enterprise: { name: 'Enterprise', price: 499, color: '#92400e' }
};

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/v1/billing/plans');
        const data = await res.json();
        setPlans(data.plans);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubscribe = async (tier) => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    try {
      const res = await fetch('/v1/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, email })
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Billing & Plans</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Subscribe to a plan</h3>
        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        <div className="grid grid-4">
          {plans.map(plan => {
            const info = TIER_INFO[plan.tier] || {};
            return (
              <div key={plan.tier} className="card" style={{ textAlign: 'center', border: plan.popular ? '2px solid #2563eb' : '1px solid #e2e8f0' }}>
                {plan.popular && (
                  <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: 18, marginBottom: 4 }}>{info.name}</h3>
                <div style={{ fontSize: 32, fontWeight: 700, color: info.color }}>
                  ${plan.price_usd}
                  <span style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>/{plan.interval}</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 16px' }}>{plan.description}</p>
                <ul style={{ listStyle: 'none', textAlign: 'left', fontSize: 12, marginBottom: 16, paddingLeft: 8 }}>
                  <li>✓ {plan.max_devices} device{plan.max_devices > 1 ? 's' : ''}</li>
                  {plan.features.map(f => (
                    <li key={f} style={{ color: '#475569' }}>✓ {f}</li>
                  ))}
                </ul>
                {plan.tier === 'free' ? (
                  <button className="btn-secondary" disabled style={{ width: '100%' }}>
                    Current Plan
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%' }}
                    onClick={() => handleSubscribe(plan.tier)}
                  >
                    Subscribe
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Already a subscriber?</h3>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
          Manage your subscription, update payment method, or cancel via the Stripe customer portal.
        </p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!email) return;
          try {
            const res = await fetch('/v1/stripe/portal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.portal_url) {
              window.location.href = data.portal_url;
            } else {
              setError(data.error || 'No subscription found');
            }
          } catch (err) {
            setError(err.message);
          }
        }}>
          <button type="submit" className="btn-secondary">Open Customer Portal</button>
        </form>
      </div>
    </>
  );
}
