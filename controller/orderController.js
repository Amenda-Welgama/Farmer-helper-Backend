const db = require("../models/index.js");
const Order = db.order;
const Users = db.users;
const sequelize = db.sequelize;
const Product = db.products;
const OrderItem = db.orderItems;

// Create a new order
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { orderDate, status, farmer_id, admin_id, totalPrice, items } = req.body;

    if (!orderDate || !status || !farmer_id || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const farmer = await Users.findByPk(farmer_id);
    if (!farmer) return res.status(404).json({ message: "Farmer not found" });

    const newOrder = await Order.create(
      { orderDate, status, farmer_id, admin_id, totalPrice },
      { transaction: t }
    );

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      await OrderItem.create(
        {
          quantity: item.quantity,
          orderPrice: product.price * item.quantity,
          product_Id: product.productId,
          order_Id: newOrder.orderId,
        },
        { transaction: t }
      );
    }

    await t.commit();
    res.status(201).json({ message: "Order created successfully", order: newOrder });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


exports.getAllOrderByPending = async (req, res) => {
  try {
    
    const orders = await Order.findAll({ where: { status: "pending" } });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const foundOrder = await Order.findByPk(id);
    if (!foundOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(foundOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderDate, totalPrice, status, farmer_id } = req.body;
    const admin_id = req.user?.userId; // Get admin_id from authenticated user

    // Optionally, check if the current user is actually an admin
    const admin = await Users.findByPk(admin_id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Only admin can update orders" });
    }

    const foundOrder = await Order.findByPk(id);
    if (!foundOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (farmer_id) {
      const farmer = await Users.findByPk(farmer_id);
      if (!farmer) {
        return res
          .status(404)
          .json({ message: `User (farmer) with ID ${farmer_id} not found` });
      }
      foundOrder.farmer_id = farmer_id;
    }

    foundOrder.admin_id = admin_id; // Always set admin_id from the authenticated user
    foundOrder.orderDate = orderDate ?? foundOrder.orderDate;
    foundOrder.totalPrice = totalPrice ?? foundOrder.totalPrice;
    foundOrder.status = status ?? foundOrder.status;
    await foundOrder.save();
    res.status(200).json(foundOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const foundOrder = await Order.findByPk(id);
    if (!foundOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    await foundOrder.destroy();
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
