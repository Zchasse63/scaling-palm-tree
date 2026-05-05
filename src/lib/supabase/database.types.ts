// Minimal database types for the Container Builder.
// Hand-typed because we only touch a small surface. Regenerate via
// `supabase gen types typescript --project-id bxoggqfqdwizimsltztq` if we add tables.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          type: string;
          is_proprietary: boolean | null;
          region: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          is_proprietary?: boolean | null;
          region?: string | null;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      customer_user_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id: string;
          display_name?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_user_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      customer_catalog_access: {
        Row: {
          id: string;
          customer_id: string;
          vendor_id: string;
          container_type: "40HC" | "40STD" | "20STD";
          terms_label: string;
          currency: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          vendor_id: string;
          container_type?: "40HC" | "40STD" | "20STD";
          terms_label?: string;
          currency?: string;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_catalog_access"]["Insert"]
        >;
        Relationships: [];
      };
      customer_orders: {
        Row: {
          id: string;
          order_number: string | null;
          customer_id: string;
          status: string;
          quoted_at: string;
          confirmed_at: string | null;
          payment_terms: string | null;
          pricing_policy_id: string | null;
          subtotal_product: number;
          subtotal_freight: number;
          total: number;
          case_count: number;
          pallet_count: number | null;
          notes: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          order_number?: string | null;
          customer_id: string;
          status?: string;
          quoted_at?: string;
          pricing_policy_id?: string | null;
          subtotal_product?: number;
          subtotal_freight?: number;
          total?: number;
          case_count?: number;
          pallet_count?: number | null;
          notes?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["customer_orders"]["Insert"]>;
        Relationships: [];
      };
      customer_order_lines: {
        Row: {
          id: string;
          order_id: string;
          line_number: number;
          vendor_product_id: string | null;
          canonical_product_id: string | null;
          sku: string | null;
          description: string | null;
          pack_size: string | null;
          cases_per_pallet: number | null;
          qty_cases: number;
          vendor_cost_per_case: number;
          margin_pct_applied: number;
          freight_per_case: number;
          sell_price_per_case: number;
          line_total: number | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          order_id: string;
          line_number: number;
          vendor_product_id?: string | null;
          canonical_product_id?: string | null;
          sku?: string | null;
          description?: string | null;
          pack_size?: string | null;
          cases_per_pallet?: number | null;
          qty_cases: number;
          vendor_cost_per_case: number;
          margin_pct_applied: number;
          freight_per_case?: number;
          sell_price_per_case: number;
          metadata?: Json;
        };
        Update: Partial<
          Database["public"]["Tables"]["customer_order_lines"]["Insert"]
        >;
        Relationships: [];
      };
      pricing_policies: {
        Row: {
          id: string;
          name: string;
          scope: string;
          scope_id: string | null;
          target_margin_pct: number;
          freight_treatment: string;
        };
        Insert: {
          id?: string;
          name: string;
          scope: string;
          scope_id?: string | null;
          target_margin_pct: number;
          freight_treatment?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pricing_policies"]["Insert"]>;
        Relationships: [];
      };
      vendor_products: {
        Row: {
          id: string;
          vendor_id: string;
          sku: string;
          description: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          sku: string;
          description: string;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["vendor_products"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      catalog_for_customer: {
        Row: {
          vendor_product_id: string;
          vendor_id: string;
          canonical_product_id: string;
          category_id: string | null;
          category_name: string | null;
          category_slug: string | null;
          product_name: string;
          vendor_sku: string;
          description: string | null;
          pack_display: string | null;
          pieces_per_case: number | null;
          cases_per_pallet: number | null;
          cases_per_40hc: number | null;
          case_weight_lb: number | null;
          case_weight_kg: number | null;
          case_length_in: number | null;
          case_width_in: number | null;
          case_height_in: number | null;
          dims_verified: boolean;
          cbm_per_case: number | null;
          pack_multiple: number | null;
          pre_palletized: boolean;
          physical_specs_verified: boolean;
          metadata: Json;
          cost_per_case: number;
          target_margin_pct: number | null;
          sell_price_per_case: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
