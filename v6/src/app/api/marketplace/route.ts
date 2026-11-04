import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const sellerEmail = searchParams.get("sellerEmail");
    const kind = searchParams.get("kind"); // 'PRODUCT' | 'SERVICE' | null
    const search = searchParams.get("search")?.toLowerCase().trim() || "";

    // 1. Resolve sellerId from sellerEmail if provided
    let resolvedSellerId = sellerId;
    if (!resolvedSellerId && sellerEmail) {
      const userRes = await query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [sellerEmail]
      );
      if (userRes.rows.length > 0) {
        resolvedSellerId = String(userRes.rows[0].id);
      }
    }

    const listings: any[] = [];

    // 2. Fetch Products
    if (!kind || kind === "PRODUCT") {
      let prodQuery = `
        SELECT 
          p.id,
          p.seller_id as "ownerId",
          'PRODUCT' as kind,
          p.product_name as title,
          COALESCE(p.category, 'Solar Panels') as category,
          COALESCE(p.description, '') as description,
          COALESCE(p.unit_price::text, '0') as price,
          COALESCE(p.stock_quantity, 10) as stock,
          p.image_url as "imageDataUrl",
          p.brand,
          CASE WHEN p.is_active = FALSE THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          u.full_name as "sellerName",
          u.email as "sellerEmail",
          u.organization as "sellerCompany",
          u.phone_number as "sellerPhone",
          u.city as "sellerCity",
          u.professional_title as "sellerRole"
        FROM products p
        LEFT JOIN users u ON p.seller_id = u.id
      `;
      const params: any[] = [];
      if (resolvedSellerId) {
        params.push(resolvedSellerId);
        prodQuery += ` WHERE p.seller_id = $${params.length}`;
      }
      prodQuery += ` ORDER BY p.created_at DESC`;

      const prodRes = await query(prodQuery, params);
      for (const row of prodRes.rows) {
        listings.push({
          ...row,
          id: `prod-${row.id}`,
          rawId: Number(row.id),
        });
      }
    }

    // 3. Fetch Services
    if (!kind || kind === "SERVICE") {
      let servQuery = `
        SELECT 
          s.id,
          s.seller_id as "ownerId",
          'SERVICE' as kind,
          s.service_name as title,
          COALESCE(s.category, 'Installation') as category,
          COALESCE(s.description, '') as description,
          COALESCE(s.base_fee::text, '0') as price,
          s.image_url as "imageDataUrl",
          COALESCE(s.coverage_area, 'Karachi & Nationwide') as "coverageArea",
          CASE WHEN s.is_active = FALSE THEN 'INACTIVE' ELSE 'ACTIVE' END as status,
          s.created_at as "createdAt",
          s.updated_at as "updatedAt",
          u.full_name as "sellerName",
          u.email as "sellerEmail",
          u.organization as "sellerCompany",
          u.phone_number as "sellerPhone",
          u.city as "sellerCity",
          u.professional_title as "sellerRole"
        FROM services s
        LEFT JOIN users u ON s.seller_id = u.id
      `;
      const params: any[] = [];
      if (resolvedSellerId) {
        params.push(resolvedSellerId);
        servQuery += ` WHERE s.seller_id = $${params.length}`;
      }
      servQuery += ` ORDER BY s.created_at DESC`;

      const servRes = await query(servQuery, params);
      for (const row of servRes.rows) {
        listings.push({
          ...row,
          id: `serv-${row.id}`,
          rawId: Number(row.id),
        });
      }
    }

    // 4. In-memory text search filtering if search param is provided
    let filtered = listings;
    if (search) {
      filtered = listings.filter(
        (item) =>
          item.title?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search) ||
          item.sellerName?.toLowerCase().includes(search) ||
          item.sellerEmail?.toLowerCase().includes(search)
      );
    }

    // Sort newest first
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      listings: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error("GET /api/marketplace error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load marketplace listings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerId,
      ownerEmail,
      kind,
      title,
      category,
      description,
      price,
      stock,
      imageDataUrl,
      coverageArea,
      brand,
      status,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Listing title is required and must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!kind || (kind !== "PRODUCT" && kind !== "SERVICE")) {
      return NextResponse.json(
        { success: false, error: "Listing kind must be either 'PRODUCT' or 'SERVICE'." },
        { status: 400 }
      );
    }

    const rawPriceClean = String(price || "").replace(/[^0-9.]/g, "");
    const priceNum = parseFloat(rawPriceClean);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Price must be a valid positive number greater than 0 PKR." },
        { status: 400 }
      );
    }

    let stockNum = 0;
    if (kind === "PRODUCT") {
      const rawStockClean = String(stock ?? "0").replace(/[^0-9]/g, "");
      stockNum = parseInt(rawStockClean, 10);
      if (isNaN(stockNum) || stockNum < 0) {
        return NextResponse.json(
          { success: false, error: "Stock quantity must be a non-negative whole number (0 or higher)." },
          { status: 400 }
        );
      }
    }

    // Resolve owner ID (check ownerId or ownerEmail in users table)
    let sellerIdNum: number | null = null;
    if (ownerId && !isNaN(Number(ownerId))) {
      sellerIdNum = Number(ownerId);
    } else if (ownerEmail) {
      const uRes = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [ownerEmail]);
      if (uRes.rows.length > 0) {
        sellerIdNum = Number(uRes.rows[0].id);
      }
    }

    // If still null, fallback to first seller user or first user
    if (!sellerIdNum) {
      const sellerRes = await query(`
        SELECT u.id FROM users u 
        JOIN user_roles ur ON u.id = ur.user_id 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'seller' 
        LIMIT 1
      `);
      if (sellerRes.rows.length > 0) {
        sellerIdNum = Number(sellerRes.rows[0].id);
      } else {
        const fallbackUser = await query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
        if (fallbackUser.rows.length > 0) {
          sellerIdNum = Number(fallbackUser.rows[0].id);
        }
      }
    }
    const isActive = status !== "INACTIVE";

    if (kind === "PRODUCT") {
      const insertRes = await query(
        `INSERT INTO products (
          seller_id, product_name, category, brand, description, unit_price, stock_quantity, image_url, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, product_name, category, brand, description, unit_price, stock_quantity, image_url, is_active, created_at, updated_at`,
        [
          sellerIdNum,
          title,
          category || "Solar Panels",
          brand || category || "Tier-1 Brand",
          description || "",
          priceNum,
          stockNum,
          imageDataUrl || null,
          isActive,
        ]
      );

      const row = insertRes.rows[0];
      return NextResponse.json({
        success: true,
        listing: {
          id: `prod-${row.id}`,
          rawId: Number(row.id),
          ownerId: String(sellerIdNum),
          kind: "PRODUCT",
          title: row.product_name,
          category: row.category,
          brand: row.brand,
          description: row.description,
          price: String(row.unit_price),
          stock: row.stock_quantity,
          imageDataUrl: row.image_url,
          status: row.is_active ? "ACTIVE" : "INACTIVE",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } else {
      const insertRes = await query(
        `INSERT INTO services (
          seller_id, provider_id, service_name, category, description, base_fee, coverage_area, image_url, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, service_name, category, description, base_fee, coverage_area, image_url, is_active, created_at, updated_at`,
        [
          sellerIdNum,
          sellerIdNum,
          title,
          category || "Installation",
          description || "",
          priceNum,
          coverageArea || "Karachi & Nationwide",
          imageDataUrl || null,
          isActive,
        ]
      );

      const row = insertRes.rows[0];
      return NextResponse.json({
        success: true,
        listing: {
          id: `serv-${row.id}`,
          rawId: Number(row.id),
          ownerId: String(sellerIdNum),
          kind: "SERVICE",
          title: row.service_name,
          category: row.category,
          description: row.description,
          price: String(row.base_fee),
          coverageArea: row.coverage_area,
          imageDataUrl: row.image_url,
          status: row.is_active ? "ACTIVE" : "INACTIVE",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    }
  } catch (error: any) {
    console.error("POST /api/marketplace error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create listing" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      ownerId,
      ownerEmail,
      title,
      category,
      brand,
      description,
      price,
      stock,
      coverageArea,
      status,
      imageDataUrl,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Listing ID is required" }, { status: 400 });
    }

    // Resolve ownerId if provided by email
    let sellerIdNum: number | null = null;
    if (ownerId && !isNaN(Number(ownerId))) {
      sellerIdNum = Number(ownerId);
    } else if (ownerEmail) {
      const uRes = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [ownerEmail]);
      if (uRes.rows.length > 0) {
        sellerIdNum = Number(uRes.rows[0].id);
      }
    }

    if (title !== undefined && (typeof title !== "string" || title.trim().length < 3)) {
      return NextResponse.json(
        { success: false, error: "Listing title must be at least 3 characters." },
        { status: 400 }
      );
    }

    let priceNum: number | undefined = undefined;
    if (price !== undefined) {
      const parsed = parseFloat(String(price).replace(/[^0-9.]/g, ""));
      if (isNaN(parsed) || parsed <= 0) {
        return NextResponse.json(
          { success: false, error: "Price must be a valid positive number greater than 0 PKR." },
          { status: 400 }
        );
      }
      priceNum = parsed;
    }

    let stockNum: number | undefined = undefined;
    if (stock !== undefined) {
      const parsed = parseInt(String(stock).replace(/[^0-9]/g, ""), 10);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { success: false, error: "Stock quantity must be a non-negative whole number (0 or higher)." },
          { status: 400 }
        );
      }
      stockNum = parsed;
    }

    const isActive = status !== undefined ? status === "ACTIVE" : undefined;

    if (id.startsWith("prod-") || !id.startsWith("serv-")) {
      const rawId = id.replace("prod-", "");
      // Check ownership
      const checkRes = await query(`SELECT id, seller_id FROM products WHERE id = $1`, [rawId]);
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      }
      if (sellerIdNum && Number(checkRes.rows[0].seller_id) !== sellerIdNum) {
        return NextResponse.json({ success: false, error: "Unauthorized: You can only edit your own products" }, { status: 403 });
      }

      await query(
        `UPDATE products SET
          product_name = COALESCE($1, product_name),
          category = COALESCE($2, category),
          brand = COALESCE($3, brand),
          description = COALESCE($4, description),
          unit_price = COALESCE($5, unit_price),
          stock_quantity = COALESCE($6, stock_quantity),
          image_url = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE image_url END,
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE id = $9`,
        [
          title || null,
          category || null,
          brand || null,
          description || null,
          priceNum !== undefined ? priceNum : null,
          stockNum !== undefined ? stockNum : null,
          imageDataUrl !== undefined ? imageDataUrl : null,
          isActive !== undefined ? isActive : null,
          rawId,
        ]
      );

      return NextResponse.json({ success: true, message: "Product updated successfully" });
    } else {
      const rawId = id.replace("serv-", "");
      // Check ownership
      const checkRes = await query(`SELECT id, seller_id FROM services WHERE id = $1`, [rawId]);
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
      }
      if (sellerIdNum && Number(checkRes.rows[0].seller_id) !== sellerIdNum) {
        return NextResponse.json({ success: false, error: "Unauthorized: You can only edit your own services" }, { status: 403 });
      }

      await query(
        `UPDATE services SET
          service_name = COALESCE($1, service_name),
          category = COALESCE($2, category),
          description = COALESCE($3, description),
          base_fee = COALESCE($4, base_fee),
          coverage_area = COALESCE($5, coverage_area),
          image_url = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE image_url END,
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
        WHERE id = $8`,
        [
          title || null,
          category || null,
          description || null,
          priceNum !== undefined ? priceNum : null,
          coverageArea || null,
          imageDataUrl !== undefined ? imageDataUrl : null,
          isActive !== undefined ? isActive : null,
          rawId,
        ]
      );

      return NextResponse.json({ success: true, message: "Service updated successfully" });
    }
  } catch (error: any) {
    console.error("PATCH /api/marketplace error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update listing" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const sellerId = searchParams.get("sellerId");
    const sellerEmail = searchParams.get("sellerEmail");

    if (!id) {
      return NextResponse.json({ success: false, error: "Listing ID is required" }, { status: 400 });
    }

    let sellerIdNum: number | null = null;
    if (sellerId && !isNaN(Number(sellerId))) {
      sellerIdNum = Number(sellerId);
    } else if (sellerEmail) {
      const uRes = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [sellerEmail]);
      if (uRes.rows.length > 0) {
        sellerIdNum = Number(uRes.rows[0].id);
      }
    }

    if (id.startsWith("prod-")) {
      const rawId = id.replace("prod-", "");
      if (sellerIdNum) {
        const check = await query(`SELECT seller_id FROM products WHERE id = $1`, [rawId]);
        if (check.rows.length > 0 && Number(check.rows[0].seller_id) !== sellerIdNum) {
          return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
        }
      }
      await query(`DELETE FROM products WHERE id = $1`, [rawId]);
    } else if (id.startsWith("serv-")) {
      const rawId = id.replace("serv-", "");
      if (sellerIdNum) {
        const check = await query(`SELECT seller_id FROM services WHERE id = $1`, [rawId]);
        if (check.rows.length > 0 && Number(check.rows[0].seller_id) !== sellerIdNum) {
          return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
        }
      }
      await query(`DELETE FROM services WHERE id = $1`, [rawId]);
    } else {
      // Fallback: try deleting by raw ID
      if (sellerIdNum) {
        await query(`DELETE FROM products WHERE id = $1 AND seller_id = $2`, [id, sellerIdNum]);
        await query(`DELETE FROM services WHERE id = $1 AND seller_id = $2`, [id, sellerIdNum]);
      } else {
        await query(`DELETE FROM products WHERE id = $1`, [id]);
        await query(`DELETE FROM services WHERE id = $1`, [id]);
      }
    }

    return NextResponse.json({ success: true, message: "Listing deleted" });
  } catch (error: any) {
    console.error("DELETE /api/marketplace error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete listing" },
      { status: 500 }
    );
  }
}
