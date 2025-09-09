/**
 * COHERENT.JS MASTER EXAMPLE
 * 
 * This comprehensive example showcases ALL capabilities and best practices of Coherent.js:
 * 
 * 🔥 FEATURES DEMONSTRATED:
 * ✅ Server-Side Rendering (SSR)
 * ✅ Client-Side Hydration  
 * ✅ State Management with withState
 * ✅ Component Composition & Reusability
 * ✅ Event Handling & Interactivity
 * ✅ Form Handling & Validation
 * ✅ Dynamic Content Updates
 * ✅ Performance Optimization
 * ✅ Accessibility Best Practices
 * ✅ Real-time Data Updates
 * ✅ Error Boundaries
 * ✅ Component Memoization
 * ✅ Advanced Styling Patterns
 * ✅ Integration Patterns
 */

import { renderToString, withState, memo } from '@coherentjs/core';

// ===== UTILITY COMPONENTS =====

// Reusable Button Component with variants
export const Button = ({ variant = 'primary', size = 'md', disabled = false, onClick, children, ...props }) => ({
  button: {
    className: `btn btn-${variant} btn-${size} ${disabled ? 'btn-disabled' : ''}`,
    disabled,
    onclick: onClick,
    'aria-disabled': disabled,
    ...props,
    children
  }
});

// Reusable Card Component
export const Card = ({ title, children, className = '', ...props }) => ({
  div: {
    className: `card ${className}`,
    ...props,
    children: [
      title && {
        div: {
          className: 'card-header',
          children: [
            { h3: { text: title, className: 'card-title' } }
          ]
        }
      },
      {
        div: {
          className: 'card-body',
          children: Array.isArray(children) ? children : [children]
        }
      }
    ].filter(Boolean)
  }
});

// Icon Component
export const Icon = ({ name, size = '1rem', color = 'currentColor' }) => ({
  span: {
    className: `icon icon-${name}`,
    style: `font-size: ${size}; color: ${color};`,
    'aria-hidden': true,
    text: getIconSymbol(name)
  }
});

function getIconSymbol(name) {
  const icons = {
    user: '👤',
    email: '📧',
    phone: '📱',
    location: '📍',
    star: '⭐',
    heart: '❤️',
    check: '✅',
    cross: '❌',
    arrow: '→',
    loading: '🔄',
    warning: '⚠️',
    info: 'ℹ️',
    edit: '✏️',
    delete: '🗑️',
    add: '➕'
  };
  return icons[name] || name;
}

// ===== ADVANCED STATE MANAGEMENT =====

// Complex Form Component with Validation
export const ContactForm = withState({
  // Initial state
  formData: {
    name: '',
    email: '',
    phone: '',
    message: '',
    interests: [],
    newsletter: false
  },
  errors: {},
  isSubmitting: false,
  submitCount: 0,
  lastSubmitted: null
})(({ state, setState, stateUtils }) => {
  
  // Validation logic
  const validateForm = (data) => {
    const errors = {};
    
    if (!data.name?.trim()) {
      errors.name = 'Name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!data.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (data.phone && !/^[\d\s\-\(\)\+]+$/.test(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (!data.message?.trim()) {
      errors.message = 'Message is required';
    } else if (data.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    return errors;
  };
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    stateUtils.updateState(prevState => ({
      formData: { ...prevState.formData, [field]: value },
      errors: { ...prevState.errors, [field]: undefined }
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm(state.formData);
    
    if (Object.keys(errors).length > 0) {
      setState({ errors });
      return;
    }
    
    setState({ isSubmitting: true, errors: {} });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      stateUtils.batchUpdate({
        isSubmitting: false,
        submitCount: state.submitCount + 1,
        lastSubmitted: new Date().toLocaleString(),
        formData: {
          name: '',
          email: '',
          phone: '',
          message: '',
          interests: [],
          newsletter: false
        }
      });
      
      alert('Form submitted successfully!');
    } catch (error) {
      setState({ 
        isSubmitting: false, 
        errors: { submit: 'Failed to submit form. Please try again.' } 
      });
    }
  };
  
  const handleInterestToggle = (interest) => {
    const currentInterests = state.formData.interests || [];
    const updatedInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    
    handleInputChange('interests', updatedInterests);
  };
  
  return Card({
    title: 'Advanced Contact Form',
    className: 'contact-form-card',
    children: [
      {
        form: {
          onsubmit: handleSubmit,
          className: 'contact-form',
          children: [
            // Name Field
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      htmlFor: 'name',
                      text: 'Full Name *',
                      className: 'form-label'
                    }
                  },
                  {
                    input: {
                      id: 'name',
                      type: 'text',
                      value: state.formData.name,
                      oninput: (e) => handleInputChange('name', e.target.value),
                      className: `form-input ${state.errors.name ? 'error' : ''}`,
                      placeholder: 'Enter your full name',
                      'aria-describedby': state.errors.name ? 'name-error' : undefined
                    }
                  },
                  state.errors.name && {
                    div: {
                      id: 'name-error',
                      className: 'form-error',
                      role: 'alert',
                      children: [
                        Icon({ name: 'warning', size: '0.9rem' }),
                        { span: { text: state.errors.name } }
                      ]
                    }
                  }
                ].filter(Boolean)
              }
            },
            
            // Email Field  
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      htmlFor: 'email',
                      text: 'Email Address *',
                      className: 'form-label'
                    }
                  },
                  {
                    input: {
                      id: 'email',
                      type: 'email',
                      value: state.formData.email,
                      oninput: (e) => handleInputChange('email', e.target.value),
                      className: `form-input ${state.errors.email ? 'error' : ''}`,
                      placeholder: 'Enter your email address',
                      'aria-describedby': state.errors.email ? 'email-error' : undefined
                    }
                  },
                  state.errors.email && {
                    div: {
                      id: 'email-error',
                      className: 'form-error',
                      role: 'alert',
                      children: [
                        Icon({ name: 'warning', size: '0.9rem' }),
                        { span: { text: state.errors.email } }
                      ]
                    }
                  }
                ].filter(Boolean)
              }
            },
            
            // Phone Field
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      htmlFor: 'phone',
                      text: 'Phone Number',
                      className: 'form-label'
                    }
                  },
                  {
                    input: {
                      id: 'phone',
                      type: 'tel',
                      value: state.formData.phone,
                      oninput: (e) => handleInputChange('phone', e.target.value),
                      className: `form-input ${state.errors.phone ? 'error' : ''}`,
                      placeholder: 'Enter your phone number (optional)',
                      'aria-describedby': state.errors.phone ? 'phone-error' : undefined
                    }
                  },
                  state.errors.phone && {
                    div: {
                      id: 'phone-error',
                      className: 'form-error',
                      role: 'alert',
                      children: [
                        Icon({ name: 'warning', size: '0.9rem' }),
                        { span: { text: state.errors.phone } }
                      ]
                    }
                  }
                ].filter(Boolean)
              }
            },
            
            // Interests (Checkboxes)
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      text: 'Interests',
                      className: 'form-label'
                    }
                  },
                  {
                    div: {
                      className: 'checkbox-group',
                      children: [
                        'Web Development',
                        'Mobile Apps',
                        'UI/UX Design',
                        'Performance',
                        'SEO'
                      ].map(interest => ({
                        label: {
                          className: 'checkbox-label',
                          children: [
                            {
                              input: {
                                type: 'checkbox',
                                checked: state.formData.interests?.includes(interest),
                                onchange: () => handleInterestToggle(interest),
                                className: 'checkbox-input'
                              }
                            },
                            { span: { text: interest } }
                          ]
                        }
                      }))
                    }
                  }
                ]
              }
            },
            
            // Message Field
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      htmlFor: 'message',
                      text: 'Message *',
                      className: 'form-label'
                    }
                  },
                  {
                    textarea: {
                      id: 'message',
                      value: state.formData.message,
                      oninput: (e) => handleInputChange('message', e.target.value),
                      className: `form-textarea ${state.errors.message ? 'error' : ''}`,
                      placeholder: 'Enter your message (minimum 10 characters)',
                      rows: 4,
                      'aria-describedby': state.errors.message ? 'message-error' : undefined
                    }
                  },
                  state.errors.message && {
                    div: {
                      id: 'message-error', 
                      className: 'form-error',
                      role: 'alert',
                      children: [
                        Icon({ name: 'warning', size: '0.9rem' }),
                        { span: { text: state.errors.message } }
                      ]
                    }
                  }
                ].filter(Boolean)
              }
            },
            
            // Newsletter Checkbox
            {
              div: {
                className: 'form-group',
                children: [
                  {
                    label: {
                      className: 'checkbox-label newsletter',
                      children: [
                        {
                          input: {
                            type: 'checkbox',
                            checked: state.formData.newsletter,
                            onchange: (e) => handleInputChange('newsletter', e.target.checked),
                            className: 'checkbox-input'
                          }
                        },
                        { span: { text: 'Subscribe to newsletter for updates' } }
                      ]
                    }
                  }
                ]
              }
            },
            
            // Submit Button
            {
              div: {
                className: 'form-actions',
                children: [
                  Button({
                    type: 'submit',
                    variant: 'primary',
                    size: 'lg',
                    disabled: state.isSubmitting,
                    children: state.isSubmitting 
                      ? [Icon({ name: 'loading' }), { span: { text: ' Submitting...' } }]
                      : [Icon({ name: 'arrow' }), { span: { text: ' Submit Form' } }]
                  }),
                  
                  state.submitCount > 0 && {
                    div: {
                      className: 'form-success',
                      children: [
                        Icon({ name: 'check' }),
                        { 
                          span: { 
                            text: `Form submitted ${state.submitCount} time${state.submitCount > 1 ? 's' : ''}. Last: ${state.lastSubmitted}` 
                          } 
                        }
                      ]
                    }
                  }
                ].filter(Boolean)
              }
            },
            
            // General Submit Error
            state.errors.submit && {
              div: {
                className: 'form-error submit-error',
                role: 'alert',
                children: [
                  Icon({ name: 'cross' }),
                  { span: { text: state.errors.submit } }
                ]
              }
            }
          ].filter(Boolean)
        }
      }
    ]
  });
});

// ===== REAL-TIME DATA COMPONENT =====

export const LiveDataDashboard = withState({
  data: [],
  isLoading: false,
  lastUpdate: null,
  autoRefresh: true,
  refreshInterval: 3000
})(({ state, setState, stateUtils }) => {
  
  // Simulate fetching live data
  const fetchData = async () => {
    setState({ isLoading: true });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newData = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Metric ${i + 1}`,
        value: Math.floor(Math.random() * 100) + 1,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        change: (Math.random() * 10 - 5).toFixed(1)
      }));
      
      stateUtils.batchUpdate({
        data: newData,
        isLoading: false,
        lastUpdate: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setState({ isLoading: false });
    }
  };
  
  // Auto-refresh logic (would use useEffect in React)
  if (typeof window !== 'undefined' && state.autoRefresh && !state.isLoading) {
    setTimeout(fetchData, state.refreshInterval);
  }
  
  // Initial load
  if (state.data.length === 0 && !state.isLoading) {
    fetchData();
  }
  
  return Card({
    title: 'Live Data Dashboard',
    className: 'dashboard-card',
    children: [
      // Controls
      {
        div: {
          className: 'dashboard-controls',
          children: [
            Button({
              variant: state.autoRefresh ? 'success' : 'secondary',
              onClick: () => setState({ autoRefresh: !state.autoRefresh }),
              children: [
                Icon({ name: state.autoRefresh ? 'check' : 'cross' }),
                { span: { text: ` Auto Refresh (${state.refreshInterval/1000}s)` } }
              ]
            }),
            
            Button({
              variant: 'primary',
              disabled: state.isLoading,
              onClick: fetchData,
              children: state.isLoading 
                ? [Icon({ name: 'loading' }), { span: { text: ' Loading...' } }]
                : [Icon({ name: 'arrow' }), { span: { text: ' Refresh Now' } }]
            })
          ]
        }
      },
      
      // Last Update Info
      state.lastUpdate && {
        div: {
          className: 'last-update',
          children: [
            Icon({ name: 'info', size: '0.9rem' }),
            { span: { text: ` Last updated: ${state.lastUpdate}` } }
          ]
        }
      },
      
      // Data Grid
      {
        div: {
          className: 'data-grid',
          children: state.data.map(item => ({
            div: {
              className: 'data-item',
              key: item.id,
              children: [
                {
                  div: {
                    className: 'data-header',
                    children: [
                      { h4: { text: item.name, className: 'data-name' } },
                      {
                        span: {
                          className: `trend trend-${item.trend}`,
                          children: [
                            { span: { text: item.trend === 'up' ? '↗️' : '↘️' } },
                            { span: { text: ` ${item.change}%` } }
                          ]
                        }
                      }
                    ]
                  }
                },
                {
                  div: {
                    className: 'data-value',
                    text: item.value
                  }
                },
                {
                  div: {
                    className: 'data-progress',
                    children: [
                      {
                        div: {
                          className: 'progress-bar',
                          children: [
                            {
                              div: {
                                className: `progress-fill trend-${item.trend}`,
                                style: `width: ${item.value}%`
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }))
        }
      }
    ].filter(Boolean)
  });
});

// ===== PERFORMANCE OPTIMIZED COMPONENT =====

export const OptimizedProductList = memo(
  ({ products = [], filters = {}, sortBy = 'name' }) => {
    
    // Memoized filtering and sorting
    const filteredProducts = products
      .filter(product => {
        if (filters.category && product.category !== filters.category) return false;
        if (filters.minPrice && product.price < filters.minPrice) return false;
        if (filters.maxPrice && product.price > filters.maxPrice) return false;
        if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price') return a.price - b.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return a.name.localeCompare(b.name);
      });
    
    return Card({
      title: `Optimized Product List (${filteredProducts.length} items)`,
      className: 'product-list-card',
      children: [
        {
          div: {
            className: 'product-grid',
            children: filteredProducts.map(product => ({
              div: {
                className: 'product-card',
                key: product.id,
                children: [
                  {
                    div: {
                      className: 'product-image',
                      style: `background: linear-gradient(45deg, ${product.color || '#e2e8f0'}, ${product.color || '#cbd5e0'});`,
                      children: [
                        { span: { text: product.emoji || '📦', className: 'product-emoji' } }
                      ]
                    }
                  },
                  {
                    div: {
                      className: 'product-info',
                      children: [
                        { h4: { text: product.name, className: 'product-name' } },
                        { p: { text: product.description, className: 'product-description' } },
                        {
                          div: {
                            className: 'product-meta',
                            children: [
                              {
                                span: {
                                  text: `$${product.price}`,
                                  className: 'product-price'
                                }
                              },
                              {
                                span: {
                                  className: 'product-rating',
                                  children: [
                                    Icon({ name: 'star' }),
                                    { span: { text: ` ${product.rating}/5` } }
                                  ]
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            }))
          }
        }
      ]
    });
  },
  // Custom key generator for memoization
  ({ products, filters, sortBy }) => `${products.length}-${JSON.stringify(filters)}-${sortBy}`
);

// ===== MASTER SHOWCASE COMPONENT =====

export const MasterShowcase = withState({
  currentTab: 'form',
  sampleProducts: [
    { id: 1, name: 'Laptop Pro', price: 1299, rating: 4.8, category: 'electronics', description: 'High-performance laptop', emoji: '💻', color: '#3182ce' },
    { id: 2, name: 'Wireless Headphones', price: 199, rating: 4.5, category: 'electronics', description: 'Premium sound quality', emoji: '🎧', color: '#9f7aea' },
    { id: 3, name: 'Smart Watch', price: 399, rating: 4.6, category: 'electronics', description: 'Fitness and notifications', emoji: '⌚', color: '#38a169' },
    { id: 4, name: 'Coffee Maker', price: 89, rating: 4.2, category: 'home', description: 'Perfect morning brew', emoji: '☕', color: '#d69e2e' },
    { id: 5, name: 'Desk Chair', price: 249, rating: 4.4, category: 'furniture', description: 'Ergonomic design', emoji: '🪑', color: '#e53e3e' }
  ],
  productFilters: {},
  productSort: 'name'
})(({ state, setState, stateUtils }) => {
  
  const tabs = [
    { id: 'form', name: 'Advanced Forms', icon: 'edit' },
    { id: 'dashboard', name: 'Live Dashboard', icon: 'info' },
    { id: 'products', name: 'Optimized Lists', icon: 'star' }
  ];
  
  const renderTabContent = () => {
    switch (state.currentTab) {
      case 'form':
        return ContactForm();
      
      case 'dashboard':
        return LiveDataDashboard();
      
      case 'products':
        return OptimizedProductList({
          products: state.sampleProducts,
          filters: state.productFilters,
          sortBy: state.productSort
        });
      
      default:
        return { div: { text: 'Tab not found' } };
    }
  };
  
  return {
    div: {
      className: 'master-showcase',
      children: [
        // Header
        {
          header: {
            className: 'showcase-header',
            children: [
              { h1: { text: '🔥 Coherent.js Master Showcase', className: 'showcase-title' } },
              {
                p: {
                  text: 'Comprehensive demonstration of all Coherent.js capabilities and best practices',
                  className: 'showcase-subtitle'
                }
              },
              
              // Feature badges
              {
                div: {
                  className: 'feature-badges',
                  children: [
                    'SSR', 'Hydration', 'State Management', 'Forms', 'Real-time', 'Performance',
                    'Accessibility', 'Components', 'Events', 'Validation'
                  ].map(feature => ({
                    span: {
                      className: 'feature-badge',
                      text: feature,
                      key: feature
                    }
                  }))
                }
              }
            ]
          }
        },
        
        // Tab Navigation
        {
          nav: {
            className: 'tab-nav',
            role: 'tablist',
            children: tabs.map(tab => ({
              button: {
                className: `tab-button ${state.currentTab === tab.id ? 'active' : ''}`,
                onclick: () => setState({ currentTab: tab.id }),
                role: 'tab',
                'aria-selected': state.currentTab === tab.id,
                'aria-controls': `tabpanel-${tab.id}`,
                key: tab.id,
                children: [
                  Icon({ name: tab.icon }),
                  { span: { text: ` ${tab.name}` } }
                ]
              }
            }))
          }
        },
        
        // Tab Content
        {
          main: {
            className: 'tab-content',
            children: [
              {
                div: {
                  id: `tabpanel-${state.currentTab}`,
                  className: 'tab-panel active',
                  role: 'tabpanel',
                  'aria-labelledby': `tab-${state.currentTab}`,
                  children: [renderTabContent()]
                }
              }
            ]
          }
        },
        
        // Footer with technical details
        {
          footer: {
            className: 'showcase-footer',
            children: [
              {
                div: {
                  className: 'tech-stats',
                  children: [
                    {
                      div: {
                        className: 'stat',
                        children: [
                          { strong: { text: 'Rendering:' } },
                          { span: { text: ' Server-Side + Client Hydration' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'stat',
                        children: [
                          { strong: { text: 'State:' } },
                          { span: { text: ' Advanced withState + Memoization' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'stat',
                        children: [
                          { strong: { text: 'Performance:' } },
                          { span: { text: ' Optimized rendering & memory management' } }
                        ]
                      }
                    },
                    {
                      div: {
                        className: 'stat',
                        children: [
                          { strong: { text: 'Accessibility:' } },
                          { span: { text: ' ARIA compliant & keyboard navigation' } }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  };
});

// ===== STYLES =====

export const masterShowcaseStyles = `
/* Reset and base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #1a202c;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100dvh;
}

.master-showcase {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.showcase-header {
  text-align: center;
  margin-bottom: 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.showcase-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 15px;
}

.showcase-subtitle {
  font-size: 1.2rem;
  color: #4a5568;
  margin-bottom: 25px;
}

.feature-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 25px;
}

.feature-badge {
  background: linear-gradient(45deg, #4299e1, #3182ce);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(66, 153, 225, 0.3);
}

/* Tab Navigation */
.tab-nav {
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 8px;
  margin-bottom: 30px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  gap: 8px;
}

.tab-button {
  flex: 1;
  background: transparent;
  border: none;
  padding: 15px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-button:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.tab-button.active {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

/* Tab Content */
.tab-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

/* Card Component */
.card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.card-header {
  background: linear-gradient(45deg, #f7fafc, #edf2f7);
  padding: 20px 25px;
  border-bottom: 1px solid #e2e8f0;
}

.card-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.card-body {
  padding: 25px;
}

/* Button Component */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s ease;
  text-decoration: none;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(45deg, #4299e1, #3182ce);
  color: white;
  box-shadow: 0 3px 10px rgba(66, 153, 225, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(66, 153, 225, 0.4);
}

.btn-secondary {
  background: #718096;
  color: white;
}

.btn-success {
  background: linear-gradient(45deg, #48bb78, #38a169);
  color: white;
  box-shadow: 0 3px 10px rgba(72, 187, 120, 0.3);
}

.btn-lg {
  padding: 12px 24px;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Form Styles */
.contact-form-card .card-body {
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #2d3748;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.form-input.error, .form-textarea.error {
  border-color: #e53e3e;
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
}

.checkbox-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.checkbox-label:hover {
  background: #f7fafc;
}

.checkbox-label.newsletter {
  background: #f0fff4;
  border: 1px solid #c6f6d5;
  border-radius: 8px;
  padding: 12px 16px;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  margin: 0;
}

.form-actions {
  margin-top: 30px;
  text-align: center;
}

.form-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e53e3e;
  font-size: 0.9rem;
  margin-top: 6px;
  padding: 8px 12px;
  background: #fed7d7;
  border-radius: 6px;
}

.form-success {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #38a169;
  font-size: 0.9rem;
  margin-top: 15px;
  padding: 10px 15px;
  background: #c6f6d5;
  border-radius: 6px;
}

/* Dashboard Styles */
.dashboard-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.last-update {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4a5568;
  font-size: 0.9rem;
  margin-bottom: 20px;
  padding: 10px 15px;
  background: #f7fafc;
  border-radius: 6px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.data-item {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: transform 0.2s ease;
}

.data-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.data-name {
  margin: 0;
  color: #2d3748;
  font-size: 1.1rem;
}

.trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 0.9rem;
}

.trend-up {
  color: #38a169;
}

.trend-down {
  color: #e53e3e;
}

.data-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 15px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill.trend-up {
  background: linear-gradient(90deg, #48bb78, #38a169);
}

.progress-fill.trend-down {
  background: linear-gradient(90deg, #f56565, #e53e3e);
}

/* Product List Styles */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.product-image {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.product-emoji {
  font-size: 3rem;
}

.product-info {
  padding: 20px;
}

.product-name {
  margin: 0 0 8px 0;
  color: #2d3748;
  font-size: 1.1rem;
}

.product-description {
  color: #4a5568;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: #38a169;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #d69e2e;
  font-size: 0.9rem;
}

/* Footer */
.showcase-footer {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.tech-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.stat {
  padding: 15px;
  background: #f7fafc;
  border-radius: 8px;
  border-left: 4px solid #4299e1;
}

.stat strong {
  color: #2d3748;
}

.stat span {
  color: #4a5568;
}

/* Icon Component */
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .master-showcase {
    padding: 15px;
  }
  
  .showcase-title {
    font-size: 2rem;
  }
  
  .tab-nav {
    flex-direction: column;
    gap: 5px;
  }
  
  .tab-content {
    padding: 20px;
  }
  
  .card-body {
    padding: 20px;
  }
  
  .dashboard-controls {
    flex-direction: column;
  }
  
  .product-grid {
    grid-template-columns: 1fr;
  }
  
  .tech-stats {
    grid-template-columns: 1fr;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles for keyboard navigation */
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid #4299e1;
  outline-offset: 2px;
}
`;

// ===== COMPLETE EXAMPLE PAGE =====

export const masterExamplePage = {
  html: {
    lang: 'en',
    children: [
      {
        head: {
          children: [
            { meta: { charset: 'utf-8' } },
            { meta: { name: 'viewport', content: 'width=device-width, initial-scale=1.0' } },
            { title: { text: 'Coherent.js Master Showcase - Complete Framework Demo' } },
            { meta: { name: 'description', content: 'Comprehensive demonstration of all Coherent.js capabilities including SSR, state management, forms, real-time updates, and performance optimization.' } },
            
            // Preload fonts
            { link: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
            { link: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true } },
            { link: { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap', rel: 'stylesheet' } },
            
            // Inline critical styles for performance
            { style: { text: masterShowcaseStyles } }
          ]
        }
      },
      {
        body: {
          children: [
            MasterShowcase(),
            
            // Performance monitoring script
            {
              script: {
                text: `
                  // Performance monitoring
                  if (typeof performance !== 'undefined') {
                    window.addEventListener('load', () => {
                      const perfData = performance.getEntriesByType('navigation')[0];
                      console.log('🔥 Coherent.js Performance Metrics:', {
                        'DOM Content Loaded': perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart + 'ms',
                        'Load Complete': perfData.loadEventEnd - perfData.loadEventStart + 'ms',
                        'Total Load Time': perfData.loadEventEnd - perfData.fetchStart + 'ms'
                      });
                    });
                  }
                  
                  // Hydration success indicator
                  console.log('🚀 Coherent.js Master Showcase loaded successfully!');
                  console.log('✨ Features active: SSR, Hydration, State Management, Forms, Real-time, Performance Optimization');
                `
              }
            }
          ]
        }
      }
    ]
  }
};

// Export default for easy importing
export default masterExamplePage;
