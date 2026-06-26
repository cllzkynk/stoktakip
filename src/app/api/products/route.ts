import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (status && status !== 'all') {
      where.status = status;
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { color: { contains: search } },
        { model: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        purchasePayment: true,
        sale: {
          include: {
            salesChannel: true,
            salePayment: true,
          },
        },
        expenses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Ürünler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, categoryId, purchasePrice, purchaseDate, color, model, size, condition, purchasePaymentId, imageData } = body;

    if (!name || !purchasePrice || !purchasePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // Get next product number
    const lastProduct = await db.product.findFirst({
      orderBy: { productNumber: 'desc' },
      select: { productNumber: true },
    });
    const productNumber = (lastProduct?.productNumber || 0) + 1;

    const product = await db.product.create({
      data: {
        productNumber,
        name: name.trim(),
        description: description?.trim() || null,
        categoryId: categoryId || null,
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: new Date(purchaseDate),
        color: color?.trim() || null,
        model: model?.trim() || null,
        size: size?.trim() || null,
        condition: condition?.trim() || null,
        imageData: imageData || null,
        purchasePaymentId,
        status: 'in_stock',
      },
      include: {
        category: true,
        purchasePayment: true,
        sale: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Ürün oluşturulamadı' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, description, categoryId, purchasePrice, purchaseDate, color, model, size, condition, isListed, status, purchasePaymentId, imageData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
    if (color !== undefined) updateData.color = color?.trim() || null;
    if (model !== undefined) updateData.model = model?.trim() || null;
    if (size !== undefined) updateData.size = size?.trim() || null;
    if (condition !== undefined) updateData.condition = condition?.trim() || null;
    if (isListed !== undefined) {
      updateData.isListed = isListed === 'true' || isListed === true;
      if ((isListed === 'true' || isListed === true) && !existing.isListed) {
        updateData.listedDate = new Date();
        updateData.status = 'listed';
      } else if (isListed === 'false' || isListed === false) {
        updateData.listedDate = null;
        if (existing.status === 'listed') updateData.status = 'in_stock';
      }
    }
    if (status !== undefined) updateData.status = status;
    if (purchasePaymentId) updateData.purchasePaymentId = purchasePaymentId;

    // Handle image update - only update if new imageData provided
    if (imageData !== undefined && imageData !== null) {
      updateData.imageData = imageData;
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        purchasePayment: true,
        sale: { include: { salesChannel: true, salePayment: true } },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Ürün güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    await db.sale.deleteMany({ where: { productId: id } });
    await db.productExpense.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 });
  }
}
