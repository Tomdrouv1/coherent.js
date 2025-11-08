/**
 * Tests for ORM Model
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model } from '../../src/model.js';

// Mock QueryBuilder
vi.mock('../../src/database/query-builder.js', () => ({
  QueryBuilder: vi.fn().mockImplementation((db, tableName) => ({
    db,
    tableName,
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    first: vi.fn(),
    execute: vi.fn(),
    exists: vi.fn()
  }))
}));

describe('Model', () => {
  let mockDb;
  let TestModel;

  beforeEach(() => {
    mockDb = {
      query: vi.fn()
    };

    // Create test model class
    class TestUser extends Model {
      static tableName = 'users';
      static primaryKey = 'id';
      static fillable = ['name', 'email', 'age'];
      static hidden = ['password'];
      static casts = {
        age: 'number',
        active: 'boolean'
      };
      static validationRules = {
        name: { required: true, minLength: 2 },
        email: { required: true, email: true },
        age: { min: 0, max: 120 }
      };
      static relationships = {
        posts: { type: 'hasMany', model: 'Post', foreignKey: 'user_id' }
      };
      static db = mockDb;
    }

    TestModel = TestUser;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with attributes', () => {
      const model = new TestModel({ name: 'John', email: 'john@example.com' });
      
      expect(model.getAttribute('name')).toBe('John');
      expect(model.getAttribute('email')).toBe('john@example.com');
      expect(model.isNew).toBe(true);
      expect(model.isDirty).toBe(false);
    });

    it('should mark as not new if primary key exists', () => {
      const model = new TestModel({ id: 1, name: 'John' });
      
      expect(model.isNew).toBe(false);
      expect(model.originalAttributes).toEqual({ id: 1, name: 'John' });
    });

    it('should initialize empty attributes', () => {
      const model = new TestModel();
      
      expect(model.attributes).toEqual({});
      expect(model.isNew).toBe(true);
    });
  });

  describe('fill', () => {
    it('should fill only fillable attributes', () => {
      const model = new TestModel();
      model.fill({ name: 'John', email: 'john@example.com', password: 'secret' });
      
      expect(model.getAttribute('name')).toBe('John');
      expect(model.getAttribute('email')).toBe('john@example.com');
      expect(model.getAttribute('password')).toBe(undefined);
    });

    it('should respect guarded attributes', () => {
      class GuardedModel extends TestModel {
        static guarded = ['email'];
      }
      
      const model = new GuardedModel();
      model.fill({ name: 'John', email: 'john@example.com' });
      
      expect(model.getAttribute('name')).toBe('John');
      expect(model.getAttribute('email')).toBe(undefined);
    });

    it('should be chainable', () => {
      const model = new TestModel();
      const result = model.fill({ name: 'John' });
      
      expect(result).toBe(model);
    });
  });

  describe('setAttribute', () => {
    it('should set attribute value', () => {
      const model = new TestModel();
      model.setAttribute('name', 'John');
      
      expect(model.getAttribute('name')).toBe('John');
    });

    it('should mark as dirty when value changes', () => {
      const model = new TestModel({ name: 'John' });
      model.isDirty = false;
      
      model.setAttribute('name', 'Jane');
      
      expect(model.isDirty).toBe(true);
    });

    it('should cast values according to casts configuration', () => {
      const model = new TestModel();
      
      model.setAttribute('age', '25');
      model.setAttribute('active', 'true');
      
      expect(model.getAttribute('age')).toBe(25);
      expect(model.getAttribute('active')).toBe(true);
    });

    it('should be chainable', () => {
      const model = new TestModel();
      const result = model.setAttribute('name', 'John');
      
      expect(result).toBe(model);
    });
  });

  describe('getAttribute', () => {
    it('should return attribute value', () => {
      const model = new TestModel({ name: 'John' });
      
      expect(model.getAttribute('name')).toBe('John');
    });

    it('should return default value if attribute not found', () => {
      const model = new TestModel();
      
      expect(model.getAttribute('name', 'Default')).toBe('Default');
    });

    it('should return null as default if no default provided', () => {
      const model = new TestModel();
      
      expect(model.getAttribute('name')).toBe(null);
    });
  });

  describe('castAttribute', () => {
    it('should cast to string', () => {
      const model = new TestModel();
      const result = model.castAttribute('name', 123, 'string');
      
      expect(result).toBe('123');
    });

    it('should cast to number', () => {
      const model = new TestModel();
      const result = model.castAttribute('age', '25', 'number');
      
      expect(result).toBe(25);
    });

    it('should cast to boolean', () => {
      const model = new TestModel();
      
      expect(model.castAttribute('active', 'true', 'boolean')).toBe(true);
      expect(model.castAttribute('active', 0, 'boolean')).toBe(false);
    });

    it('should cast to date', () => {
      const model = new TestModel();
      const dateString = '2023-12-01';
      const result = model.castAttribute('created_at', dateString, 'date');
      
      expect(result).toBeInstanceOf(Date);
    });

    it('should cast to json', () => {
      const model = new TestModel();
      const jsonString = '{"key": "value"}';
      const result = model.castAttribute('metadata', jsonString, 'json');
      
      expect(result).toEqual({ key: 'value' });
    });

    it('should cast to array', () => {
      const model = new TestModel();
      
      expect(model.castAttribute('tags', 'single', 'array')).toEqual(['single']);
      expect(model.castAttribute('tags', ['multiple'], 'array')).toEqual(['multiple']);
    });

    it('should return null/undefined values unchanged', () => {
      const model = new TestModel();
      
      expect(model.castAttribute('name', null, 'string')).toBe(null);
      expect(model.castAttribute('name', undefined, 'string')).toBe('undefined');
    });
  });

  describe('toObject', () => {
    it('should return all attributes', () => {
      const model = new TestModel({ name: 'John', email: 'john@example.com', password: 'secret' });
      const result = model.toObject(true);
      
      expect(result).toEqual({ name: 'John', email: 'john@example.com', password: 'secret' });
    });

    it('should exclude hidden attributes by default', () => {
      const model = new TestModel({ name: 'John', password: 'secret' });
      const result = model.toObject();
      
      expect(result).toEqual({ name: 'John' });
      expect(result.password).toBe(undefined);
    });
  });

  describe('toJSON', () => {
    it('should return object without hidden attributes', () => {
      const model = new TestModel({ name: 'John', password: 'secret' });
      const result = model.toJSON();
      
      expect(result).toEqual({ name: 'John' });
    });
  });

  describe('validate', () => {
    it('should pass validation for valid data', async () => {
      const model = new TestModel({ 
        name: 'John Doe', 
        email: 'john@example.com',
        age: 25 
      });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(true);
      expect(model.errors).toEqual({});
    });

    it('should fail validation for required fields', async () => {
      const model = new TestModel({ email: 'john@example.com' });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(false);
      expect(model.errors.name).toContain('name is required');
    });

    it('should fail validation for invalid email', async () => {
      const model = new TestModel({ 
        name: 'John',
        email: 'invalid-email'
      });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(false);
      expect(model.errors.email).toContain('email must be a valid email address');
    });

    it('should fail validation for string length', async () => {
      const model = new TestModel({ 
        name: 'J',
        email: 'john@example.com'
      });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(false);
      expect(model.errors.name).toContain('name must be at least 2 characters');
    });

    it('should fail validation for number range', async () => {
      const model = new TestModel({ 
        name: 'John',
        email: 'john@example.com',
        age: 150
      });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(false);
      expect(model.errors.age).toContain('age must be no more than 120');
    });

    it('should skip validation for empty non-required fields', async () => {
      const model = new TestModel({ 
        name: 'John',
        email: 'john@example.com'
        // age is not provided but not required
      });
      
      const isValid = await model.validate();
      
      expect(isValid).toBe(true);
    });
  });

  describe('save', () => {
    it('should insert new model', async () => {
      const model = new TestModel({ name: 'John', email: 'john@example.com' });
      mockDb.query.mockResolvedValue({ insertId: 1 });
      
      await model.save();
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.any(Array)
      );
      expect(model.getAttribute('id')).toBe(1);
      expect(model.isNew).toBe(false);
      expect(model.isDirty).toBe(false);
    });

    it('should update existing model', async () => {
      const model = new TestModel({ id: 1, name: 'John' });
      model.isNew = false;
      model.setAttribute('name', 'Jane');
      
      mockDb.query.mockResolvedValue({ affectedRows: 1 });
      
      await model.save();
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array)
      );
      expect(model.isDirty).toBe(false);
    });

    it('should not update if not dirty', async () => {
      const model = new TestModel({ id: 1, name: 'John' });
      model.isNew = false;
      model.isDirty = false;
      
      await model.save();
      
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should fail validation and throw _error', async () => {
      const model = new TestModel({ email: 'invalid-email' });
      
      await expect(model.save()).rejects.toThrow('Validation failed');
    });

    it('should skip validation when requested', async () => {
      const model = new TestModel({ email: 'invalid-email' });
      mockDb.query.mockResolvedValue({ insertId: 1 });
      
      await model.save({ skipValidation: true });
      
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should add timestamps for new models', async () => {
      const model = new TestModel({ name: 'John', email: 'john@example.com' });
      mockDb.query.mockResolvedValue({ insertId: 1 });
      
      await model.save();
      
      expect(model.getAttribute('created_at')).toBeInstanceOf(Date);
      expect(model.getAttribute('updated_at')).toBeInstanceOf(Date);
    });

    it('should update timestamp for existing models', async () => {
      const model = new TestModel({ id: 1, name: 'John' });
      model.isNew = false;
      model.setAttribute('name', 'Jane');
      
      mockDb.query.mockResolvedValue({ affectedRows: 1 });
      
      await model.save();
      
      expect(model.getAttribute('updated_at')).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('should delete model from database', async () => {
      const model = new TestModel({ id: 1, name: 'John' });
      mockDb.query.mockResolvedValue({ affectedRows: 1 });
      
      const result = await model.delete();
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should throw _error if no primary key', async () => {
      const model = new TestModel({ name: 'John' });
      
      await expect(model.delete()).rejects.toThrow('Cannot delete model without primary key');
    });
  });

  describe('static methods', () => {
    describe('find', () => {
      it('should find model by primary key', async () => {
        const mockResult = { id: 1, name: 'John' };
        mockDb.query.mockResolvedValue(mockResult);
        
        const model = await TestModel.find(1);
        
        expect(model).toBeInstanceOf(TestModel);
        expect(model.getAttribute('id')).toBe(1);
        expect(model.getAttribute('name')).toBe('John');
        expect(model.isNew).toBe(false);
      });

      it('should return null if not found', async () => {
        mockDb.query.mockResolvedValue(null);
        
        const model = await TestModel.find(999);
        
        expect(model).toBe(null);
      });
    });

    describe('findOrFail', () => {
      it('should find model by primary key', async () => {
        const mockResult = { id: 1, name: 'John' };
        mockDb.query.mockResolvedValue(mockResult);
        
        const model = await TestModel.findOrFail(1);
        
        expect(model).toBeInstanceOf(TestModel);
      });

      it('should throw _error if not found', async () => {
        mockDb.query.mockResolvedValue(null);
        
        await expect(TestModel.findOrFail(999)).rejects.toThrow('TestUser with id 999 not found');
      });
    });

    describe('all', () => {
      it('should return all models', async () => {
        const mockResult = { 
          rows: [
            { id: 1, name: 'John' },
            { id: 2, name: 'Jane' }
          ]
        };
        mockDb.query.mockResolvedValue(mockResult);
        
        const models = await TestModel.all();
        
        expect(models).toHaveLength(2);
        expect(models[0]).toBeInstanceOf(TestModel);
        expect(models[1]).toBeInstanceOf(TestModel);
      });

      it('should return empty array if no results', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });
        
        const models = await TestModel.all();
        
        expect(models).toEqual([]);
      });
    });

    describe('create', () => {
      it('should create and save new model', async () => {
        mockDb.query.mockResolvedValue({ insertId: 1 });
        
        const model = await TestModel.create({ name: 'John', email: 'john@example.com' });
        
        expect(model).toBeInstanceOf(TestModel);
        expect(model.getAttribute('id')).toBe(1);
        expect(model.isNew).toBe(false);
      });
    });

    describe('updateWhere', () => {
      it('should update models matching conditions', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 3 });
        
        const count = await TestModel.updateWhere(
          { active: false },
          { status: 'inactive' }
        );
        
        expect(count).toBe(3);
      });
    });

    describe('deleteWhere', () => {
      it('should delete models matching conditions', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 2 });
        
        const count = await TestModel.deleteWhere({ active: false });
        
        expect(count).toBe(2);
      });
    });
  });

  describe('relationships', () => {
    it('should get hasMany relationship', async () => {
      const model = new TestModel({ id: 1, name: 'John' });
      
      // Mock Post model
      const mockPosts = { 
        rows: [
          { id: 1, title: 'Post 1', user_id: 1 },
          { id: 2, title: 'Post 2', user_id: 1 }
        ]
      };
      
      // Mock the Post model class
      global.Post = class Post extends Model {
        static db = mockDb;
        static where = vi.fn().mockReturnThis();
        static execute = vi.fn().mockResolvedValue(mockPosts);
      };
      
      const posts = await model.getRelation('posts');
      
      expect(posts).toHaveLength(2);
    });

    it('should throw _error for undefined relationship', async () => {
      const model = new TestModel({ id: 1 });
      
      await expect(model.getRelation('undefined_relation')).rejects.toThrow(
        "Relationship 'undefined_relation' not defined on TestUser"
      );
    });
  });

  describe('lifecycle hooks', () => {
    it('should call lifecycle hooks during save', async () => {
      class HookedModel extends TestModel {
        async beforeSave() { this.beforeSaveCalled = true; }
        async afterSave() { this.afterSaveCalled = true; }
        async beforeCreate() { this.beforeCreateCalled = true; }
        async afterCreate() { this.afterCreateCalled = true; }
      }
      
      const model = new HookedModel({ name: 'John', email: 'john@example.com' });
      mockDb.query.mockResolvedValue({ insertId: 1 });
      
      await model.save();
      
      expect(model.beforeSaveCalled).toBe(true);
      expect(model.afterSaveCalled).toBe(true);
      expect(model.beforeCreateCalled).toBe(true);
      expect(model.afterCreateCalled).toBe(true);
    });

    it('should call lifecycle hooks during delete', async () => {
      class HookedModel extends TestModel {
        async beforeDelete() { this.beforeDeleteCalled = true; }
        async afterDelete() { this.afterDeleteCalled = true; }
      }
      
      const model = new HookedModel({ id: 1, name: 'John' });
      mockDb.query.mockResolvedValue({ affectedRows: 1 });
      
      await model.delete();
      
      expect(model.beforeDeleteCalled).toBe(true);
      expect(model.afterDeleteCalled).toBe(true);
    });
  });
});
