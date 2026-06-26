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

// Helper: convert File to base64 data URI
async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string);
    const purchaseDate = new Date(formData.get('purchaseDate') as string);
    const color = formData.get('color') as string;
    const model = formData.get('model') as string;
    const size = formData.get('size') as string;
    const condition = formData.get('condition') as string;
    const purchasePaymentId = formData.get('purchasePaymentId') as string;
    const imageFile = formData.get('image') as File | null;

    if (!name || isNaN(purchasePrice) || !purchasePaymentId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // Get next product number
    const lastProduct = await db.product.findFirst({
      orderBy: { productNumber: 'desc' },
      select: { productNumber: true },
    });
    const productNumber = (lastProduct?.productNumber || 0) + 1;

    let imageData: string | null = null;
    if (imageFile && imageFile.size > 0) {
      // Limit image size to 2MB
      if (imageFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Resim boyutu 2MB\'dan küçük olmalı' }, { status: 400 });
      }
      imageData = await fileToBase64(imageFile);
    }

    const product = await db.product.create({
      data: {
        productNumber,
        name: name.trim(),
        description: description?.trim() || null,
        categoryId: categoryId || null,
        purchasePrice,
        purchaseDate,
        color: color?.trim() || null,
        model: model?.trim() || null,
        size: size?.trim() || null,
        condition: condition?.trim() || null,
        imageData,
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
    const formData = await req.formData();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const purchasePrice = parseFloat(formData.get('purchasePrice') as string);
    const purchaseDate = formData.get('purchaseDate') as string;
    const color = formData.get('color') as string;
    const model = formData.get('model') as string;
    const size = formData.get('size') as string;
    const condition = formData.get('condition') as string;
    const isListed = formData.get('isListed') as string;
    const status = formData.get('status') as string;
    const purchasePaymentId = formData.get('purchasePaymentId') as string;
    const imageFile = formData.get('image') as File | null;

    if (!id) {
      return NextResponse.json({ error: 'Ürün ID gerekli' }, { status: 400 });
    }

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== null) updateData.name = name.trim();
    if (description !== null) updateData.description = description?.trim() || null;
    if (categoryId !== null) updateData.categoryId = categoryId || null;
    if (!isNaN(purchasePrice)) updateData.purchasePrice = purchasePrice;
    if (purchaseDate) updateData.purchaseDate = new Date(purchaseDate);
    if (color !== null) updateData.color = color?.trim() || null;
    if (model !== null) updateData.model = model?.trim() || null;
    if (size !== null) updateData.size = size?.trim() || null;
    if (condition !== null) updateData.condition = condition?.trim() || null;
    if (isListed !== null) {
      updateData.isListed = isListed === 'true';
      if (isListed === 'true' && !existing.isListed) {
        updateData.listedDate = new Date();
        updateData.status = 'listed';
      } else if (isListed === 'false') {
        updateData.listedDate = null;
        if (existing.status === 'listed') updateData.status = 'in_stock';
      }
    }
    if (status !== null) updateData.status = status;
    if (purchasePaymentId) updateData.purchasePaymentId = purchasePaymentId;

    // Handle image update
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Resim boyutu 2MB\'dan küçük olmalı' }, { status: 400 });
      }
      updateData.imageData = await fileToBase64(imageFile);
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
