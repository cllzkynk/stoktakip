import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        children: true,
        products: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const rootCategories = categories.filter(c => !c.parentId);
    return NextResponse.json(rootCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, parentId } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Kategori adı gerekli' }, { status: 400 });
    }

    if (parentId) {
      const parent = await db.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: 'Üst kategori bulunamadı' }, { status: 404 });
      }
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        parentId: parentId || null,
      },
      include: { children: true },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kategori ID gerekli' }, { status: 400 });
    }

    const productsCount = await db.product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      return NextResponse.json({ error: 'Bu kategoride ürünler var, önce ürünleri taşıyın veya silin' }, { status: 400 });
    }

    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 });
  }
}
