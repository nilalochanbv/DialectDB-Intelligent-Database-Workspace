from sqlalchemy import Table, Column, Integer, String, Float, Date, ForeignKey, MetaData, create_engine
from app.config import DEFAULT_DB_PATH, DATABASE_URL
import datetime
import os

def create_and_seed_demo_db():
    """
    Creates and populates the SQLite demo database with customer names, locations, 
    orders, and amounts matching the target UI design mockup exactly.
    """
    if DEFAULT_DB_PATH.exists():
        try:
            os.remove(DEFAULT_DB_PATH)
        except Exception as e:
            print(f"Warning: Could not remove existing file: {e}")
            
    engine = create_engine(DATABASE_URL)
    metadata = MetaData()
    
    # Define tables
    customers = Table(
        'customers', metadata,
        Column('customer_id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(100), nullable=False),
        Column('email', String(100), nullable=False),
        Column('phone', String(20)),
        Column('city', String(50)),
        Column('country', String(50))
    )
    
    products = Table(
        'products', metadata,
        Column('product_id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(100), nullable=False),
        Column('category', String(50)),
        Column('price', Float, nullable=False),
        Column('stock_quantity', Integer, default=0)
    )
    
    orders = Table(
        'orders', metadata,
        Column('order_id', Integer, primary_key=True, autoincrement=True),
        Column('customer_id', Integer, ForeignKey('customers.customer_id')),
        Column('order_date', Date, nullable=False),
        Column('total_amount', Float, nullable=False),
        Column('status', String(20), default='Pending')
    )
    
    order_items = Table(
        'order_items', metadata,
        Column('order_item_id', Integer, primary_key=True, autoincrement=True),
        Column('order_id', Integer, ForeignKey('orders.order_id')),
        Column('product_id', Integer, ForeignKey('products.product_id')),
        Column('quantity', Integer, nullable=False),
        Column('unit_price', Float, nullable=False)
    )
    
    categories = Table(
        'categories', metadata,
        Column('category_id', Integer, primary_key=True, autoincrement=True),
        Column('name', String(50), nullable=False)
    )

    metadata.create_all(engine)
    
    with engine.connect() as conn:
        # Seed Customers (including the exact Chennai list from the screenshot)
        conn.execute(customers.insert(), [
            {"customer_id": 1, "name": "Arjun Mehta", "email": "arjun@chennai.in", "phone": "+91 98400 11111", "city": "Chennai", "country": "India"},
            {"customer_id": 2, "name": "Priya Nair", "email": "priya@chennai.in", "phone": "+91 94440 22222", "city": "Chennai", "country": "India"},
            {"customer_id": 3, "name": "John Doe", "email": "john.doe@gmail.com", "phone": "+1 555-0199", "city": "New York", "country": "USA"},
            {"customer_id": 4, "name": "Karthik R", "email": "karthik@chennai.in", "phone": "+91 99220 33333", "city": "Chennai", "country": "India"},
            {"customer_id": 5, "name": "Meena Krishnan", "email": "meena@chennai.in", "phone": "+91 98410 44444", "city": "Chennai", "country": "India"},
            {"customer_id": 6, "name": "Yuki Tanaka", "email": "yuki.t@tanaka.co.jp", "phone": "+81 3 5555 0122", "city": "Tokyo", "country": "Japan"},
            {"customer_id": 7, "name": "Vikram Iyer", "email": "vikram@chennai.in", "phone": "+91 94450 55555", "city": "Chennai", "country": "India"},
        ])
        
        # Seed Categories (to match table list in screenshot)
        conn.execute(categories.insert(), [
            {"name": "Electronics"},
            {"name": "Furniture"},
            {"name": "Accessories"}
        ])

        # Seed Products
        conn.execute(products.insert(), [
            {"name": "M3 MacBook Pro", "category": "Electronics", "price": 1999.99, "stock_quantity": 45},
            {"name": "iPhone 16 Pro", "category": "Electronics", "price": 999.99, "stock_quantity": 120},
            {"name": "Wireless Headphones", "category": "Accessories", "price": 299.99, "stock_quantity": 80},
            {"name": "Office Chair", "category": "Furniture", "price": 349.50, "stock_quantity": 30},
            {"name": "Mechanical Keyboard", "category": "Accessories", "price": 129.99, "stock_quantity": 150},
        ])
        
        # Current local time date is June 30, 2026
        # May 2026 (Last Month)
        # Seed Orders matching the exact counts and total amounts in the screenshot
        conn.execute(orders.insert(), [
            # Arjun Mehta (Customer 1): 3 orders, total spent = 12500.00
            {"customer_id": 1, "order_date": datetime.date(2026, 5, 2), "total_amount": 5000.00, "status": "Delivered"},
            {"customer_id": 1, "order_date": datetime.date(2026, 5, 12), "total_amount": 4500.00, "status": "Delivered"},
            {"customer_id": 1, "order_date": datetime.date(2026, 5, 28), "total_amount": 3000.00, "status": "Delivered"},
            
            # Priya Nair (Customer 2): 2 orders, total spent = 8200.00
            {"customer_id": 2, "order_date": datetime.date(2026, 5, 5), "total_amount": 5000.00, "status": "Delivered"},
            {"customer_id": 2, "order_date": datetime.date(2026, 5, 20), "total_amount": 3200.00, "status": "Delivered"},
            
            # Karthik R (Customer 4): 2 orders, total spent = 6200.00
            {"customer_id": 4, "order_date": datetime.date(2026, 5, 15), "total_amount": 4000.00, "status": "Delivered"},
            {"customer_id": 4, "order_date": datetime.date(2026, 5, 25), "total_amount": 2200.00, "status": "Delivered"},
            
            # Meena Krishnan (Customer 5): 1 order, total spent = 4800.00
            {"customer_id": 5, "order_date": datetime.date(2026, 5, 18), "total_amount": 4800.00, "status": "Delivered"},
            
            # Vikram Iyer (Customer 7): 1 order, total spent = 3900.00
            {"customer_id": 7, "order_date": datetime.date(2026, 5, 8), "total_amount": 3900.00, "status": "Delivered"},
            
            # John Doe (Customer 3): 1 order
            {"customer_id": 3, "order_date": datetime.date(2026, 5, 10), "total_amount": 999.99, "status": "Delivered"},
        ])
        
        # Seed Order Items
        conn.execute(order_items.insert(), [
            {"order_id": 1, "product_id": 1, "quantity": 2, "unit_price": 2500.00},
            {"order_id": 2, "product_id": 2, "quantity": 4, "unit_price": 1125.00},
            {"order_id": 3, "product_id": 3, "quantity": 10, "unit_price": 300.00},
            {"order_id": 4, "product_id": 1, "quantity": 2, "unit_price": 2500.00},
            {"order_id": 5, "product_id": 2, "quantity": 2, "unit_price": 1600.00},
            {"order_id": 6, "product_id": 2, "quantity": 2, "unit_price": 2000.00},
            {"order_id": 7, "product_id": 3, "quantity": 11, "unit_price": 200.00},
            {"order_id": 8, "product_id": 1, "quantity": 1, "unit_price": 4800.00},
            {"order_id": 9, "product_id": 1, "quantity": 1, "unit_price": 3900.00},
            {"order_id": 10, "product_id": 2, "quantity": 1, "unit_price": 999.99},
        ])
        
        conn.commit()
    print("Seeded database matching UI mockups successfully.")

if __name__ == "__main__":
    create_and_seed_demo_db()
