/**
 * Tests for ORM Model
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Model } from '../../src/model.js';

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

    it('should fail validation and throw error', async () => {
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

    it('should throw error if no primary key', async () => {
      const model = new TestModel({ name: 'John' });
      
      await expect(model.delete()).rejects.toThrow('Cannot delete model without primary key');
    });
  });

  describe('static methods', () => {
    describe('find', () => {
      it('should find model by primary key', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 1, name: 'John' }] });

        const model = await TestModel.find(1);

        expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ? LIMIT 1', [1]);
        expect(model).toBeInstanceOf(TestModel);
        expect(model.getAttribute('id')).toBe(1);
        expect(model.getAttribute('name')).toBe('John');
        expect(model.isNew).toBe(false);
      });

      it('should return null when no row matches, whatever the id', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });

        expect(await TestModel.find(424242)).toBe(null);
        expect(await TestModel.find(999)).toBe(null);
      });

      it('should return null for a null driver result', async () => {
        mockDb.query.mockResolvedValue(null);

        expect(await TestModel.find(1)).toBe(null);
      });
    });

    describe('findOrFail', () => {
      it('should find model by primary key', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 1, name: 'John' }] });

        const model = await TestModel.findOrFail(1);

        expect(model).toBeInstanceOf(TestModel);
        expect(model.getAttribute('name')).toBe('John');
      });

      it('should throw error if not found', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });

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

        expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users', []);
        expect(models.map(model => model.toObject())).toEqual(mockResult.rows);
        expect(models[0]).toBeInstanceOf(TestModel);
      });

      it('should return empty array if no results', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });

        const models = await TestModel.all();

        expect(models).toEqual([]);
      });
    });

    describe('where', () => {
      it('should bind every condition as a parameter', async () => {
        mockDb.query.mockResolvedValue({ rows: [{ id: 3, name: 'Ann', active: true }] });

        const models = await TestModel.where({ active: true, deleted_at: null });

        expect(mockDb.query).toHaveBeenCalledWith('SELECT * FROM users WHERE active = ? AND deleted_at IS NULL', [true]);
        expect(models.map(model => model.toObject())).toEqual([{ id: 3, name: 'Ann', active: true }]);
      });

      it('should reject keys that are not identifiers', async () => {
        await expect(TestModel.where({ '1=1 OR id': 5 })).rejects.toThrow('Invalid SQL identifier');
        expect(mockDb.query).not.toHaveBeenCalled();
      });

      it('should reject operator objects, e.g. from a request body', async () => {
        await expect(TestModel.where({ id: { '>': 0 } })).rejects.toThrow('must be a single value');
        expect(mockDb.query).not.toHaveBeenCalled();
      });
    });

    describe('create', () => {
      it('should create and save new model', async () => {
        mockDb.query.mockResolvedValue({ rows: [], insertId: 7 });

        const model = await TestModel.create({ name: 'John', email: 'john@example.com' });

        expect(model).toBeInstanceOf(TestModel);
        expect(model.getAttribute('id')).toBe(7);
        expect(model.isNew).toBe(false);
      });

      it('should not invent a primary key when the driver reports none', async () => {
        mockDb.query.mockResolvedValue({ rows: [] });

        const model = await TestModel.create({ name: 'John', email: 'john@example.com' });

        expect(model.getAttribute('id')).toBe(null);
      });
    });

    describe('updateWhere', () => {
      it('should return the affected row count reported by the driver', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 3 });

        const count = await TestModel.updateWhere(
          { active: false },
          { status: 'inactive' }
        );

        expect(mockDb.query).toHaveBeenCalledWith('UPDATE users SET status = ? WHERE active = ?', ['inactive', false]);
        expect(count).toBe(3);
      });

      it('should return 0 when no row changed', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 0 });

        expect(await TestModel.updateWhere({ id: 1 }, { name: 'x' })).toBe(0);
      });

      it('should refuse to update without conditions or with unsafe keys', async () => {
        await expect(TestModel.updateWhere({}, { name: 'x' })).rejects.toThrow('requires at least one condition');
        await expect(TestModel.updateWhere({ id: 1 }, { 'name = 1, role': 'admin' })).rejects.toThrow('Invalid SQL identifier');
        expect(mockDb.query).not.toHaveBeenCalled();
      });
    });

    describe('deleteWhere', () => {
      it('should return the deleted row count reported by the driver', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 2 });

        const count = await TestModel.deleteWhere({ active: false });

        expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM users WHERE active = ?', [false]);
        expect(count).toBe(2);
      });

      it('should return 0 when no row matched', async () => {
        mockDb.query.mockResolvedValue({ affectedRows: 0 });

        expect(await TestModel.deleteWhere({ id: 1 })).toBe(0);
      });

      it('should refuse to delete without conditions', async () => {
        await expect(TestModel.deleteWhere({})).rejects.toThrow('requires at least one condition');
        await expect(TestModel.deleteWhere({ id: undefined })).rejects.toThrow('undefined');
        expect(mockDb.query).not.toHaveBeenCalled();
      });
    });
  });

  describe('without a database', () => {
    class Detached extends Model {
      static tableName = 'detached';
    }

    it('should throw instead of returning invented records', async () => {
      await expect(Detached.find(1)).rejects.toThrow('Detached has no database connection');
      await expect(Detached.all()).rejects.toThrow('has no database connection');
      await expect(Detached.where({ id: 1 })).rejects.toThrow('has no database connection');
      await expect(Detached.updateWhere({ id: 1 }, { a: 1 })).rejects.toThrow('has no database connection');
      await expect(Detached.deleteWhere({ id: 1 })).rejects.toThrow('has no database connection');
    });

    it('should throw instead of pretending to save or delete', async () => {
      const model = new Detached({ title: 't' });
      await expect(model.save()).rejects.toThrow('Detached has no database connection');
      expect(model.getAttribute('id')).toBe(null);
      expect(model.isNew).toBe(true);

      await expect(new Detached({ id: 5 }).delete()).rejects.toThrow('has no database connection');
    });
  });

  describe('set', () => {
    it('should mark the model dirty so save() persists the change', async () => {
      const model = new TestModel({ id: 1, name: 'John', email: 'john@example.com' });
      mockDb.query.mockResolvedValue({ affectedRows: 1 });

      model.set('name', 'Jane');
      expect(model.isDirty).toBe(true);
      await model.save();

      const [sql, params] = mockDb.query.mock.calls[0];
      expect(sql).toBe('UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?');
      expect(params.slice(0, 2)).toEqual(['Jane', 'john@example.com']);
      expect(params[3]).toBe(1);
    });
  });

  describe('relationships', () => {
    it('should load hasMany and belongsTo relationships through the related model', async () => {
      class Post extends Model {
        static tableName = 'posts';
        static db = mockDb;
        static relationships = { author: { type: 'belongsTo', model: 'TestUser', foreignKey: 'user_id' } };
      }
      class Author extends Model {
        static tableName = 'users';
        static db = mockDb;
        static relationships = { posts: { type: 'hasMany', model: Post, foreignKey: 'user_id' } };
      }

      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Post 1', user_id: 1 },
          { id: 2, title: 'Post 2', user_id: 1 }
        ]
      });

      const posts = await new Author({ id: 1, name: 'John' }).posts();

      expect(mockDb.query).toHaveBeenLastCalledWith('SELECT * FROM posts WHERE user_id = ?', [1]);
      expect(posts.map(post => post.get('title'))).toEqual(['Post 1', 'Post 2']);
      expect(posts[0]).toBeInstanceOf(Post);

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      expect(await new Author({ id: 2 }).getRelation('posts')).toEqual([]);

      global.TestUser = TestModel;
      try {
        mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'John' }] });
        const author = await posts[0].author();
        expect(mockDb.query).toHaveBeenLastCalledWith('SELECT * FROM users WHERE id = ?', [1]);
        expect(author.get('name')).toBe('John');
      } finally {
        delete global.TestUser;
      }
    });

    it('should not invent related records', async () => {
      const model = new TestModel({ id: 1, name: 'John' });

      // TestModel declares posts -> 'Post', which is not registered anywhere
      await expect(model.getRelation('posts')).rejects.toThrow('Related model Post');
      expect(Model.prototype.user).toBeUndefined();
    });

    it('should throw error for undefined relationship', async () => {
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
