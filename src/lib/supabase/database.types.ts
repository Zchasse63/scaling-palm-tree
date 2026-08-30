export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          bucket: string
          canonical_product_id: string | null
          checksum_sha256: string | null
          company_id: string | null
          customer_filename: string | null
          customer_order_id: string | null
          id: string
          interaction_id: string | null
          metadata: Json
          mime_type: string | null
          notes: string | null
          original_filename: string | null
          price_sheet_id: string | null
          purpose: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          vendor_product_id: string | null
        }
        Insert: {
          bucket: string
          canonical_product_id?: string | null
          checksum_sha256?: string | null
          company_id?: string | null
          customer_filename?: string | null
          customer_order_id?: string | null
          id?: string
          interaction_id?: string | null
          metadata?: Json
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          price_sheet_id?: string | null
          purpose?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_product_id?: string | null
        }
        Update: {
          bucket?: string
          canonical_product_id?: string | null
          checksum_sha256?: string | null
          company_id?: string | null
          customer_filename?: string | null
          customer_order_id?: string | null
          id?: string
          interaction_id?: string | null
          metadata?: Json
          mime_type?: string | null
          notes?: string | null
          original_filename?: string | null
          price_sheet_id?: string | null
          purpose?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "attachments_customer_order_id_fkey"
            columns: ["customer_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_interaction_id_fkey"
            columns: ["interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      business_models: {
        Row: {
          created_at: string
          description: string
          is_active: boolean
          name: string
          parent_slug: string | null
          slug: string
          sort_order: number | null
          vertical: string
        }
        Insert: {
          created_at?: string
          description: string
          is_active?: boolean
          name: string
          parent_slug?: string | null
          slug: string
          sort_order?: number | null
          vertical: string
        }
        Update: {
          created_at?: string
          description?: string
          is_active?: boolean
          name?: string
          parent_slug?: string | null
          slug?: string
          sort_order?: number | null
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_models_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      cadence_rules: {
        Row: {
          active: boolean
          applies_to_stage: string | null
          applies_to_type: string | null
          channel: string
          company_id: string | null
          created_at: string
          id: string
          interval_days: number
          notes: string | null
          priority: number
        }
        Insert: {
          active?: boolean
          applies_to_stage?: string | null
          applies_to_type?: string | null
          channel?: string
          company_id?: string | null
          created_at?: string
          id?: string
          interval_days: number
          notes?: string | null
          priority?: number
        }
        Update: {
          active?: boolean
          applies_to_stage?: string | null
          applies_to_type?: string | null
          channel?: string
          company_id?: string | null
          created_at?: string
          id?: string
          interval_days?: number
          notes?: string | null
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "cadence_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      canonical_products: {
        Row: {
          basis_weight_lb: number | null
          capacity_ml: number | null
          category_id: string | null
          color: string | null
          compartments: number | null
          compostable: boolean | null
          created_at: string
          finish: string | null
          freezer_safe: boolean | null
          fsc_certified: boolean | null
          gauge_micron: number | null
          gauge_mil: number | null
          grade: string | null
          gsm: number | null
          heat_lamp_safe: boolean | null
          id: string
          individually_wrapped: boolean | null
          length_ft: number | null
          material: string | null
          microwave_safe: boolean | null
          name: string
          notes: string | null
          ounce_capacity: number | null
          oven_safe: boolean | null
          pack_count: number | null
          ply_count: number | null
          recyclable_code: string | null
          recycled_content_pct: number | null
          rim_mm: number | null
          shape: string | null
          size_unit: string | null
          size_value: number | null
          slug: string | null
          spec: Json
          unit_weight_g: number | null
          updated_at: string
          width_in: number | null
        }
        Insert: {
          basis_weight_lb?: number | null
          capacity_ml?: number | null
          category_id?: string | null
          color?: string | null
          compartments?: number | null
          compostable?: boolean | null
          created_at?: string
          finish?: string | null
          freezer_safe?: boolean | null
          fsc_certified?: boolean | null
          gauge_micron?: number | null
          gauge_mil?: number | null
          grade?: string | null
          gsm?: number | null
          heat_lamp_safe?: boolean | null
          id?: string
          individually_wrapped?: boolean | null
          length_ft?: number | null
          material?: string | null
          microwave_safe?: boolean | null
          name: string
          notes?: string | null
          ounce_capacity?: number | null
          oven_safe?: boolean | null
          pack_count?: number | null
          ply_count?: number | null
          recyclable_code?: string | null
          recycled_content_pct?: number | null
          rim_mm?: number | null
          shape?: string | null
          size_unit?: string | null
          size_value?: number | null
          slug?: string | null
          spec?: Json
          unit_weight_g?: number | null
          updated_at?: string
          width_in?: number | null
        }
        Update: {
          basis_weight_lb?: number | null
          capacity_ml?: number | null
          category_id?: string | null
          color?: string | null
          compartments?: number | null
          compostable?: boolean | null
          created_at?: string
          finish?: string | null
          freezer_safe?: boolean | null
          fsc_certified?: boolean | null
          gauge_micron?: number | null
          gauge_mil?: number | null
          grade?: string | null
          gsm?: number | null
          heat_lamp_safe?: boolean | null
          id?: string
          individually_wrapped?: boolean | null
          length_ft?: number | null
          material?: string | null
          microwave_safe?: boolean | null
          name?: string
          notes?: string | null
          ounce_capacity?: number | null
          oven_safe?: boolean | null
          pack_count?: number | null
          ply_count?: number | null
          recyclable_code?: string | null
          recycled_content_pct?: number | null
          rim_mm?: number | null
          shape?: string | null
          size_unit?: string | null
          size_value?: number | null
          slug?: string | null
          spec?: Json
          unit_weight_g?: number | null
          updated_at?: string
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canonical_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          business_model_slug: string | null
          buying_group_id: string | null
          chain_stage: string | null
          created_at: string
          cuisine_primary: string | null
          cuisine_secondary: string | null
          deleted_at: string | null
          disqualified_reason: string | null
          domains: string[] | null
          est_annual_case_volume: number | null
          est_annual_revenue_usd: number | null
          est_confidence: string
          franchisee_parent_id: string | null
          id: string
          imported_from: string | null
          is_active: boolean
          is_pinned: boolean
          is_proprietary: boolean
          lead_source: string | null
          lead_source_date: string | null
          legal_name: string | null
          metadata: Json
          name: string
          notes: string | null
          operates_brand_ids: string[] | null
          phone: string | null
          pipeline_stage: string
          priority_tier: string | null
          region: string | null
          region_assigned_at: string | null
          slug: string | null
          type: string
          unit_count: number | null
          unit_count_estimated: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          business_model_slug?: string | null
          buying_group_id?: string | null
          chain_stage?: string | null
          created_at?: string
          cuisine_primary?: string | null
          cuisine_secondary?: string | null
          deleted_at?: string | null
          disqualified_reason?: string | null
          domains?: string[] | null
          est_annual_case_volume?: number | null
          est_annual_revenue_usd?: number | null
          est_confidence?: string
          franchisee_parent_id?: string | null
          id?: string
          imported_from?: string | null
          is_active?: boolean
          is_pinned?: boolean
          is_proprietary?: boolean
          lead_source?: string | null
          lead_source_date?: string | null
          legal_name?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          operates_brand_ids?: string[] | null
          phone?: string | null
          pipeline_stage?: string
          priority_tier?: string | null
          region?: string | null
          region_assigned_at?: string | null
          slug?: string | null
          type: string
          unit_count?: number | null
          unit_count_estimated?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          business_model_slug?: string | null
          buying_group_id?: string | null
          chain_stage?: string | null
          created_at?: string
          cuisine_primary?: string | null
          cuisine_secondary?: string | null
          deleted_at?: string | null
          disqualified_reason?: string | null
          domains?: string[] | null
          est_annual_case_volume?: number | null
          est_annual_revenue_usd?: number | null
          est_confidence?: string
          franchisee_parent_id?: string | null
          id?: string
          imported_from?: string | null
          is_active?: boolean
          is_pinned?: boolean
          is_proprietary?: boolean
          lead_source?: string | null
          lead_source_date?: string | null
          legal_name?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          operates_brand_ids?: string[] | null
          phone?: string | null
          pipeline_stage?: string
          priority_tier?: string | null
          region?: string | null
          region_assigned_at?: string | null
          slug?: string | null
          type?: string
          unit_count?: number | null
          unit_count_estimated?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_buying_group_id_fkey"
            columns: ["buying_group_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      company_tags: {
        Row: {
          added_at: string
          added_by: string | null
          company_id: string
          note: string | null
          tag_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          company_id: string
          note?: string | null
          tag_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          company_id?: string
          note?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_prices: {
        Row: {
          competitor_product_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          origin_location_id: string | null
          price_basis: string
          price_per_case: number
          source: string | null
          source_attachment_id: string | null
        }
        Insert: {
          competitor_product_id: string
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          origin_location_id?: string | null
          price_basis: string
          price_per_case: number
          source?: string | null
          source_attachment_id?: string | null
        }
        Update: {
          competitor_product_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          origin_location_id?: string | null
          price_basis?: string
          price_per_case?: number
          source?: string | null
          source_attachment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_products: {
        Row: {
          canonical_product_id: string | null
          case_pack_count: number | null
          cases_per_pallet: number | null
          competitor_id: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          is_active: boolean
          metadata: Json
          notes: string | null
          pack_display: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          canonical_product_id?: string | null
          case_pack_count?: number | null
          cases_per_pallet?: number | null
          competitor_id: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          is_active?: boolean
          metadata?: Json
          notes?: string | null
          pack_display?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          canonical_product_id?: string | null
          case_pack_count?: number | null
          cases_per_pallet?: number | null
          competitor_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          notes?: string | null
          pack_display?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_products_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      customer_catalog_access: {
        Row: {
          container_type: string
          created_at: string
          currency: string
          customer_id: string
          display_name: string | null
          id: string
          is_active: boolean
          min_case_qty: number
          min_fill_pct: number
          prices_pending: boolean
          prices_pending_reason: string | null
          slug: string
          terms_label: string
          vendor_id: string
        }
        Insert: {
          container_type?: string
          created_at?: string
          currency?: string
          customer_id: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          min_case_qty?: number
          min_fill_pct?: number
          prices_pending?: boolean
          prices_pending_reason?: string | null
          slug: string
          terms_label?: string
          vendor_id: string
        }
        Update: {
          container_type?: string
          created_at?: string
          currency?: string
          customer_id?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          min_case_qty?: number
          min_fill_pct?: number
          prices_pending?: boolean
          prices_pending_reason?: string | null
          slug?: string
          terms_label?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_catalog_access_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      customer_order_lines: {
        Row: {
          canonical_product_id: string | null
          case_weight_lb: number | null
          cases_per_pallet: number | null
          created_at: string
          customer_item_code: string | null
          description: string | null
          freight_per_case: number
          id: string
          line_number: number
          line_total: number | null
          line_weight_lb: number | null
          margin_pct_applied: number
          metadata: Json
          notes: string | null
          order_id: string
          origin_location_id: string | null
          pack_size: string | null
          po_unit_price: number | null
          price_correction: number | null
          price_sheet_line_id: string | null
          qty_allocated_cases: number
          qty_cases: number
          qty_pallets: number | null
          qty_shipped_cases: number
          sell_price_per_case: number
          sku: string | null
          uom: string | null
          updated_at: string
          vendor_cost_per_case: number
          vendor_id: string | null
          vendor_product_id: string | null
        }
        Insert: {
          canonical_product_id?: string | null
          case_weight_lb?: number | null
          cases_per_pallet?: number | null
          created_at?: string
          customer_item_code?: string | null
          description?: string | null
          freight_per_case?: number
          id?: string
          line_number: number
          line_total?: number | null
          line_weight_lb?: number | null
          margin_pct_applied: number
          metadata?: Json
          notes?: string | null
          order_id: string
          origin_location_id?: string | null
          pack_size?: string | null
          po_unit_price?: number | null
          price_correction?: number | null
          price_sheet_line_id?: string | null
          qty_allocated_cases?: number
          qty_cases: number
          qty_pallets?: number | null
          qty_shipped_cases?: number
          sell_price_per_case: number
          sku?: string | null
          uom?: string | null
          updated_at?: string
          vendor_cost_per_case: number
          vendor_id?: string | null
          vendor_product_id?: string | null
        }
        Update: {
          canonical_product_id?: string | null
          case_weight_lb?: number | null
          cases_per_pallet?: number | null
          created_at?: string
          customer_item_code?: string | null
          description?: string | null
          freight_per_case?: number
          id?: string
          line_number?: number
          line_total?: number | null
          line_weight_lb?: number | null
          margin_pct_applied?: number
          metadata?: Json
          notes?: string | null
          order_id?: string
          origin_location_id?: string | null
          pack_size?: string | null
          po_unit_price?: number | null
          price_correction?: number | null
          price_sheet_line_id?: string | null
          qty_allocated_cases?: number
          qty_cases?: number
          qty_pallets?: number | null
          qty_shipped_cases?: number
          sell_price_per_case?: number
          sku?: string | null
          uom?: string | null
          updated_at?: string
          vendor_cost_per_case?: number
          vendor_id?: string | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_order_lines_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_price_sheet_line_id_fkey"
            columns: ["price_sheet_line_id"]
            isOneToOne: false
            referencedRelation: "price_sheet_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          bill_to_person_id: string | null
          cancelled_at: string | null
          case_count: number
          computed_total_weight_lb: number | null
          confirmation_doc_path: string | null
          confirmation_interaction_id: string | null
          confirmation_sent_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          customer_po_date: string | null
          customer_po_number: string | null
          delivered_at: string | null
          discrepancies: Json | null
          freight_actual_total: number | null
          freight_carrier_scac: string | null
          freight_quote_id: string | null
          freight_tracking_number: string | null
          fulfillment_basis: string | null
          id: string
          internal_notes: string | null
          invoiced_at: string | null
          metadata: Json
          notes: string | null
          order_number: string | null
          origin_location_id: string | null
          paid_at: string | null
          pallet_count: number | null
          payment_terms: string | null
          po_attachment_id: string | null
          po_interaction_id: string | null
          po_source: string | null
          price_sheet_id: string | null
          pricing_policy_id: string | null
          quoted_at: string
          requested_date: string | null
          route_type: string | null
          ship_to_location_id: string | null
          shipped_at: string | null
          stated_total_weight_lb: number | null
          status: string
          subtotal_freight: number
          subtotal_product: number
          total: number
          updated_at: string
        }
        Insert: {
          bill_to_person_id?: string | null
          cancelled_at?: string | null
          case_count?: number
          computed_total_weight_lb?: number | null
          confirmation_doc_path?: string | null
          confirmation_interaction_id?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          customer_po_date?: string | null
          customer_po_number?: string | null
          delivered_at?: string | null
          discrepancies?: Json | null
          freight_actual_total?: number | null
          freight_carrier_scac?: string | null
          freight_quote_id?: string | null
          freight_tracking_number?: string | null
          fulfillment_basis?: string | null
          id?: string
          internal_notes?: string | null
          invoiced_at?: string | null
          metadata?: Json
          notes?: string | null
          order_number?: string | null
          origin_location_id?: string | null
          paid_at?: string | null
          pallet_count?: number | null
          payment_terms?: string | null
          po_attachment_id?: string | null
          po_interaction_id?: string | null
          po_source?: string | null
          price_sheet_id?: string | null
          pricing_policy_id?: string | null
          quoted_at?: string
          requested_date?: string | null
          route_type?: string | null
          ship_to_location_id?: string | null
          shipped_at?: string | null
          stated_total_weight_lb?: number | null
          status?: string
          subtotal_freight?: number
          subtotal_product?: number
          total?: number
          updated_at?: string
        }
        Update: {
          bill_to_person_id?: string | null
          cancelled_at?: string | null
          case_count?: number
          computed_total_weight_lb?: number | null
          confirmation_doc_path?: string | null
          confirmation_interaction_id?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_po_date?: string | null
          customer_po_number?: string | null
          delivered_at?: string | null
          discrepancies?: Json | null
          freight_actual_total?: number | null
          freight_carrier_scac?: string | null
          freight_quote_id?: string | null
          freight_tracking_number?: string | null
          fulfillment_basis?: string | null
          id?: string
          internal_notes?: string | null
          invoiced_at?: string | null
          metadata?: Json
          notes?: string | null
          order_number?: string | null
          origin_location_id?: string | null
          paid_at?: string | null
          pallet_count?: number | null
          payment_terms?: string | null
          po_attachment_id?: string | null
          po_interaction_id?: string | null
          po_source?: string | null
          price_sheet_id?: string | null
          pricing_policy_id?: string | null
          quoted_at?: string
          requested_date?: string | null
          route_type?: string | null
          ship_to_location_id?: string | null
          shipped_at?: string | null
          stated_total_weight_lb?: number | null
          status?: string
          subtotal_freight?: number
          subtotal_product?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_bill_to_person_id_fkey"
            columns: ["bill_to_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_confirmation_interaction_id_fkey"
            columns: ["confirmation_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_freight_quote_id_fkey"
            columns: ["freight_quote_id"]
            isOneToOne: false
            referencedRelation: "freight_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_po_attachment_id_fkey"
            columns: ["po_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_po_interaction_id_fkey"
            columns: ["po_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_pricing_policy_id_fkey"
            columns: ["pricing_policy_id"]
            isOneToOne: false
            referencedRelation: "pricing_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_ship_to_location_id_fkey"
            columns: ["ship_to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_usage: {
        Row: {
          baily_sku: string | null
          canonical_product_id: string | null
          company_id: string
          competitor_product_id: string | null
          description: string
          id: string
          loaded_at: string
          metadata: Json
          notes: string | null
          source_file: string
          source_label: string
          source_year: string | null
          volume_cases: number | null
        }
        Insert: {
          baily_sku?: string | null
          canonical_product_id?: string | null
          company_id: string
          competitor_product_id?: string | null
          description: string
          id?: string
          loaded_at?: string
          metadata?: Json
          notes?: string | null
          source_file?: string
          source_label: string
          source_year?: string | null
          volume_cases?: number | null
        }
        Update: {
          baily_sku?: string | null
          canonical_product_id?: string | null
          company_id?: string
          competitor_product_id?: string | null
          description?: string
          id?: string
          loaded_at?: string
          metadata?: Json
          notes?: string | null
          source_file?: string
          source_label?: string
          source_year?: string | null
          volume_cases?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_usage_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_usage_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_usage_backup_08_27_2026: {
        Row: {
          baily_sku: string | null
          canonical_product_id: string | null
          company_id: string | null
          competitor_product_id: string | null
          description: string | null
          id: string | null
          loaded_at: string | null
          metadata: Json | null
          notes: string | null
          source_file: string | null
          source_label: string | null
          source_year: string | null
          volume_cases: number | null
        }
        Insert: {
          baily_sku?: string | null
          canonical_product_id?: string | null
          company_id?: string | null
          competitor_product_id?: string | null
          description?: string | null
          id?: string | null
          loaded_at?: string | null
          metadata?: Json | null
          notes?: string | null
          source_file?: string | null
          source_label?: string | null
          source_year?: string | null
          volume_cases?: number | null
        }
        Update: {
          baily_sku?: string | null
          canonical_product_id?: string | null
          company_id?: string | null
          competitor_product_id?: string | null
          description?: string | null
          id?: string | null
          loaded_at?: string | null
          metadata?: Json | null
          notes?: string | null
          source_file?: string | null
          source_label?: string | null
          source_year?: string | null
          volume_cases?: number | null
        }
        Relationships: []
      }
      customer_user_profiles: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      dashboard_pages: {
        Row: {
          ai_insights: Json
          company_id: string
          id: string
          last_rewritten_at: string
          rewrite_trigger: string | null
          summary_markdown: string
        }
        Insert: {
          ai_insights?: Json
          company_id: string
          id?: string
          last_rewritten_at?: string
          rewrite_trigger?: string | null
          summary_markdown: string
        }
        Update: {
          ai_insights?: Json
          company_id?: string
          id?: string
          last_rewritten_at?: string
          rewrite_trigger?: string | null
          summary_markdown?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dashboard_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      data_quality_log: {
        Row: {
          id: string
          logged_at: string
          message: string
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule: string
          severity: string
          source_id: string | null
          source_sku: string | null
          source_table: string
        }
        Insert: {
          id?: string
          logged_at?: string
          message: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule: string
          severity: string
          source_id?: string | null
          source_sku?: string | null
          source_table: string
        }
        Update: {
          id?: string
          logged_at?: string
          message?: string
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule?: string
          severity?: string
          source_id?: string | null
          source_sku?: string | null
          source_table?: string
        }
        Relationships: []
      }
      draft_orders: {
        Row: {
          catalog_slug: string
          created_at: string
          customer_id: string
          id: string
          qty_map: Json
          updated_at: string
          vendor_id: string
        }
        Insert: {
          catalog_slug: string
          created_at?: string
          customer_id: string
          id?: string
          qty_map?: Json
          updated_at?: string
          vendor_id: string
        }
        Update: {
          catalog_slug?: string
          created_at?: string
          customer_id?: string
          id?: string
          qty_map?: Json
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "draft_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      followups: {
        Row: {
          based_on_interaction_id: string | null
          channel: string
          company_id: string
          due_date: string
          generated_at: string
          id: string
          metadata: Json
          person_id: string | null
          reason: string
          resolved_at: string | null
          resolved_by_interaction_id: string | null
          snooze_until: string | null
          status: string
        }
        Insert: {
          based_on_interaction_id?: string | null
          channel?: string
          company_id: string
          due_date: string
          generated_at?: string
          id?: string
          metadata?: Json
          person_id?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by_interaction_id?: string | null
          snooze_until?: string | null
          status?: string
        }
        Update: {
          based_on_interaction_id?: string | null
          channel?: string
          company_id?: string
          due_date?: string
          generated_at?: string
          id?: string
          metadata?: Json
          person_id?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by_interaction_id?: string | null
          snooze_until?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_based_on_interaction_id_fkey"
            columns: ["based_on_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "followups_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_resolved_by_interaction_id_fkey"
            columns: ["resolved_by_interaction_id"]
            isOneToOne: false
            referencedRelation: "interactions"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_lanes: {
        Row: {
          created_at: string
          dest_location_id: string
          id: string
          metadata: Json
          miles: number | null
          notes: string | null
          origin_location_id: string
          typical_freight_class: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dest_location_id: string
          id?: string
          metadata?: Json
          miles?: number | null
          notes?: string | null
          origin_location_id: string
          typical_freight_class?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dest_location_id?: string
          id?: string
          metadata?: Json
          miles?: number | null
          notes?: string | null
          origin_location_id?: string
          typical_freight_class?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_lanes_dest_location_id_fkey"
            columns: ["dest_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_lanes_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_quote_results: {
        Row: {
          base_charge: number | null
          carrier_code: string | null
          carrier_id: string | null
          carrier_name: string | null
          created_at: string
          discount: number | null
          expires: string | null
          fuel_surcharge: number | null
          guarantee_type: string | null
          id: string
          quote_id: string
          rank: number | null
          raw: Json | null
          total: number
          transit_days: number | null
        }
        Insert: {
          base_charge?: number | null
          carrier_code?: string | null
          carrier_id?: string | null
          carrier_name?: string | null
          created_at?: string
          discount?: number | null
          expires?: string | null
          fuel_surcharge?: number | null
          guarantee_type?: string | null
          id?: string
          quote_id: string
          rank?: number | null
          raw?: Json | null
          total: number
          transit_days?: number | null
        }
        Update: {
          base_charge?: number | null
          carrier_code?: string | null
          carrier_id?: string | null
          carrier_name?: string | null
          created_at?: string
          discount?: number | null
          expires?: string | null
          fuel_surcharge?: number | null
          guarantee_type?: string | null
          id?: string
          quote_id?: string
          rank?: number | null
          raw?: Json | null
          total?: number
          transit_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quote_results_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "freight_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_quotes: {
        Row: {
          created_at: string
          description: string | null
          dest_location_id: string | null
          dest_zip: string | null
          freight_class: string
          hazardous: boolean
          id: string
          lane_id: string | null
          min_carrier_id: string | null
          min_total: number | null
          notes: string | null
          origin_location_id: string | null
          origin_zip: string | null
          pallet_qty: number
          pickup_date: string | null
          price_sheet_id: string | null
          pulled_at: string
          pulled_for: string | null
          request_payload: Json | null
          response_raw: Json | null
          source: string
          stackable: boolean
          weight_lb: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          dest_location_id?: string | null
          dest_zip?: string | null
          freight_class: string
          hazardous?: boolean
          id?: string
          lane_id?: string | null
          min_carrier_id?: string | null
          min_total?: number | null
          notes?: string | null
          origin_location_id?: string | null
          origin_zip?: string | null
          pallet_qty: number
          pickup_date?: string | null
          price_sheet_id?: string | null
          pulled_at?: string
          pulled_for?: string | null
          request_payload?: Json | null
          response_raw?: Json | null
          source: string
          stackable?: boolean
          weight_lb: number
        }
        Update: {
          created_at?: string
          description?: string | null
          dest_location_id?: string | null
          dest_zip?: string | null
          freight_class?: string
          hazardous?: boolean
          id?: string
          lane_id?: string | null
          min_carrier_id?: string | null
          min_total?: number | null
          notes?: string | null
          origin_location_id?: string | null
          origin_zip?: string | null
          pallet_qty?: number
          pickup_date?: string | null
          price_sheet_id?: string | null
          pulled_at?: string
          pulled_for?: string | null
          request_payload?: Json | null
          response_raw?: Json | null
          source?: string
          stackable?: boolean
          weight_lb?: number
        }
        Relationships: [
          {
            foreignKeyName: "freight_quotes_dest_location_id_fkey"
            columns: ["dest_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quotes_lane_id_fkey"
            columns: ["lane_id"]
            isOneToOne: false
            referencedRelation: "freight_lanes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_min_carrier_id_fkey"
            columns: ["min_carrier_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "freight_quotes_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quotes_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_shipment_lines: {
        Row: {
          id: string
          notes: string | null
          qty_cases: number | null
          shipment_id: string
          sku: string | null
          vendor_product_id: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          qty_cases?: number | null
          shipment_id: string
          sku?: string | null
          vendor_product_id?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          qty_cases?: number | null
          shipment_id?: string
          sku?: string | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_shipment_lines_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "inbound_shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipment_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_shipments: {
        Row: {
          container_no: string | null
          created_at: string
          destination_location_id: string | null
          eta: string | null
          etd: string | null
          id: string
          metadata: Json
          notes: string | null
          po_number: string | null
          receive_id: string | null
          received_at: string | null
          status: string
          vendor_id: string | null
        }
        Insert: {
          container_no?: string | null
          created_at?: string
          destination_location_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          po_number?: string | null
          receive_id?: string | null
          received_at?: string | null
          status?: string
          vendor_id?: string | null
        }
        Update: {
          container_no?: string | null
          created_at?: string
          destination_location_id?: string | null
          eta?: string | null
          etd?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          po_number?: string | null
          receive_id?: string | null
          received_at?: string | null
          status?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_shipments_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "inbound_shipments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      interactions: {
        Row: {
          attachment_ids: string[] | null
          body: string | null
          body_format: string | null
          company_id: string | null
          created_at: string
          direction: string | null
          duration_min: number | null
          email_bcc: string[] | null
          email_cc: string[] | null
          email_from: string | null
          email_message_id: string | null
          email_subject: string | null
          email_thread_id: string | null
          email_to: string[] | null
          followup_due: string | null
          id: string
          interaction_type: string
          is_followup_required: boolean | null
          metadata: Json
          notes: string | null
          occurred_at: string
          person_id: string | null
          related_order_id: string | null
          related_price_sheet_id: string | null
          related_quote_id: string | null
          sentiment: string | null
          source: string
          source_account: string | null
          source_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          attachment_ids?: string[] | null
          body?: string | null
          body_format?: string | null
          company_id?: string | null
          created_at?: string
          direction?: string | null
          duration_min?: number | null
          email_bcc?: string[] | null
          email_cc?: string[] | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          email_thread_id?: string | null
          email_to?: string[] | null
          followup_due?: string | null
          id?: string
          interaction_type: string
          is_followup_required?: boolean | null
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          person_id?: string | null
          related_order_id?: string | null
          related_price_sheet_id?: string | null
          related_quote_id?: string | null
          sentiment?: string | null
          source?: string
          source_account?: string | null
          source_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attachment_ids?: string[] | null
          body?: string | null
          body_format?: string | null
          company_id?: string | null
          created_at?: string
          direction?: string | null
          duration_min?: number | null
          email_bcc?: string[] | null
          email_cc?: string[] | null
          email_from?: string | null
          email_message_id?: string | null
          email_subject?: string | null
          email_thread_id?: string | null
          email_to?: string[] | null
          followup_due?: string | null
          id?: string
          interaction_type?: string
          is_followup_required?: boolean | null
          metadata?: Json
          notes?: string | null
          occurred_at?: string
          person_id?: string | null
          related_order_id?: string | null
          related_price_sheet_id?: string | null
          related_quote_id?: string | null
          sentiment?: string | null
          source?: string
          source_account?: string | null
          source_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_related_price_sheet_id_fkey"
            columns: ["related_price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "freight_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          count_method: string | null
          counted_at: string
          counted_by: string | null
          created_at: string
          id: string
          location_id: string
          notes: string | null
          pallets_on_hand: number | null
          qty_cases: number
          qty_picked_cases: number | null
          source_file: string | null
          vendor_product_id: string
        }
        Insert: {
          count_method?: string | null
          counted_at?: string
          counted_by?: string | null
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          pallets_on_hand?: number | null
          qty_cases: number
          qty_picked_cases?: number | null
          source_file?: string | null
          vendor_product_id: string
        }
        Update: {
          count_method?: string | null
          counted_at?: string
          counted_by?: string | null
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          pallets_on_hand?: number | null
          qty_cases?: number
          qty_picked_cases?: number | null
          source_file?: string | null
          vendor_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      location_receiving_contacts: {
        Row: {
          created_at: string
          id: string
          location_id: string
          person_id: string
          role_note: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          person_id: string
          role_note?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          person_id?: string
          role_note?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "location_receiving_contacts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_receiving_contacts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          company_id: string | null
          country: string
          created_at: string
          deleted_at: string | null
          delivery_mode: string
          id: string
          import_source: string | null
          is_destination: boolean
          is_origin: boolean
          is_primary: boolean
          lat: number | null
          lng: number | null
          location_type: string
          metadata: Json
          name: string | null
          notes: string | null
          receiving_hours: Json | null
          receiving_hours_raw: string | null
          receiving_notes: string | null
          receiving_phone: string | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company_id?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          delivery_mode?: string
          id?: string
          import_source?: string | null
          is_destination?: boolean
          is_origin?: boolean
          is_primary?: boolean
          lat?: number | null
          lng?: number | null
          location_type?: string
          metadata?: Json
          name?: string | null
          notes?: string | null
          receiving_hours?: Json | null
          receiving_hours_raw?: string | null
          receiving_notes?: string | null
          receiving_phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company_id?: string | null
          country?: string
          created_at?: string
          deleted_at?: string | null
          delivery_mode?: string
          id?: string
          import_source?: string | null
          is_destination?: boolean
          is_origin?: boolean
          is_primary?: boolean
          lat?: number | null
          lng?: number | null
          location_type?: string
          metadata?: Json
          name?: string | null
          notes?: string | null
          receiving_hours?: Json | null
          receiving_hours_raw?: string | null
          receiving_notes?: string | null
          receiving_phone?: string | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      note_actions: {
        Row: {
          action_kind: string
          confidence: number | null
          detected_at: string
          follow_up_at: string | null
          id: string
          metadata: Json
          model_version: string | null
          note_id: string
          source_quote: string | null
          status: string
          target_company_id: string | null
          target_person_id: string | null
        }
        Insert: {
          action_kind: string
          confidence?: number | null
          detected_at?: string
          follow_up_at?: string | null
          id?: string
          metadata?: Json
          model_version?: string | null
          note_id: string
          source_quote?: string | null
          status?: string
          target_company_id?: string | null
          target_person_id?: string | null
        }
        Update: {
          action_kind?: string
          confidence?: number | null
          detected_at?: string
          follow_up_at?: string | null
          id?: string
          metadata?: Json
          model_version?: string | null
          note_id?: string
          source_quote?: string | null
          status?: string
          target_company_id?: string | null
          target_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_actions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_actions_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      note_entities: {
        Row: {
          company_id: string | null
          created_at: string
          entity_kind: string
          id: string
          note_id: string
          person_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          entity_kind: string
          id?: string
          note_id: string
          person_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          entity_kind?: string
          id?: string
          note_id?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "note_entities_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_entities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          day_date: string
          id: string
          source: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          day_date?: string
          id?: string
          source?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          day_date?: string
          id?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          classification_notes: string | null
          classified_at: string | null
          classified_by: string | null
          company_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          email_aliases: string[] | null
          email_count: number | null
          email_status: string
          first_name: string | null
          first_seen: string | null
          full_name: string | null
          function: string | null
          id: string
          imported_from: string | null
          invalid_email_detected_at: string | null
          invalid_email_reason: string | null
          is_decision_maker: boolean
          last_name: string | null
          last_seen: string | null
          metadata: Json
          notes: string | null
          phone: string | null
          phone_e164: string | null
          role: string | null
          seniority: string
          updated_at: string
        }
        Insert: {
          classification_notes?: string | null
          classified_at?: string | null
          classified_by?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_aliases?: string[] | null
          email_count?: number | null
          email_status?: string
          first_name?: string | null
          first_seen?: string | null
          full_name?: string | null
          function?: string | null
          id?: string
          imported_from?: string | null
          invalid_email_detected_at?: string | null
          invalid_email_reason?: string | null
          is_decision_maker?: boolean
          last_name?: string | null
          last_seen?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: string | null
          seniority?: string
          updated_at?: string
        }
        Update: {
          classification_notes?: string | null
          classified_at?: string | null
          classified_by?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_aliases?: string[] | null
          email_count?: number | null
          email_status?: string
          first_name?: string | null
          first_seen?: string | null
          full_name?: string | null
          function?: string | null
          id?: string
          imported_from?: string | null
          invalid_email_detected_at?: string | null
          invalid_email_reason?: string | null
          is_decision_maker?: boolean
          last_name?: string | null
          last_seen?: string | null
          metadata?: Json
          notes?: string | null
          phone?: string | null
          phone_e164?: string | null
          role?: string | null
          seniority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      people_tags: {
        Row: {
          added_at: string
          added_by: string | null
          note: string | null
          person_id: string
          tag_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          person_id: string
          tag_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          note?: string | null
          person_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_tags_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sheet_lines: {
        Row: {
          cases_per_pallet: number | null
          created_at: string
          description: string
          display_order: number | null
          freight_per_case_snapshot: Json | null
          id: string
          notes: string | null
          origin_location_id: string | null
          pack_display: string | null
          price_sheet_id: string
          prices: Json
          section_name: string | null
          sku: string | null
          subsection_name: string | null
          vendor_cost_per_case: number | null
          vendor_product_id: string | null
        }
        Insert: {
          cases_per_pallet?: number | null
          created_at?: string
          description: string
          display_order?: number | null
          freight_per_case_snapshot?: Json | null
          id?: string
          notes?: string | null
          origin_location_id?: string | null
          pack_display?: string | null
          price_sheet_id: string
          prices: Json
          section_name?: string | null
          sku?: string | null
          subsection_name?: string | null
          vendor_cost_per_case?: number | null
          vendor_product_id?: string | null
        }
        Update: {
          cases_per_pallet?: number | null
          created_at?: string
          description?: string
          display_order?: number | null
          freight_per_case_snapshot?: Json | null
          id?: string
          notes?: string | null
          origin_location_id?: string | null
          pack_display?: string | null
          price_sheet_id?: string
          prices?: Json
          section_name?: string | null
          sku?: string | null
          subsection_name?: string | null
          vendor_cost_per_case?: number | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_sheet_lines_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_price_sheet_id_fkey"
            columns: ["price_sheet_id"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheet_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      price_sheets: {
        Row: {
          category_id: string | null
          created_at: string
          customer_id: string | null
          destination_location_id: string | null
          doc_name: string | null
          excel_attachment_id: string | null
          freight_quote_ids: string[] | null
          generated_at: string
          generated_by: string | null
          id: string
          internal_slug: string
          is_current: boolean
          metadata: Json
          notes: string | null
          pdf_attachment_id: string | null
          pricing_policy_id: string | null
          spec_json: Json
          superseded_by: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          destination_location_id?: string | null
          doc_name?: string | null
          excel_attachment_id?: string | null
          freight_quote_ids?: string[] | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          internal_slug: string
          is_current?: boolean
          metadata?: Json
          notes?: string | null
          pdf_attachment_id?: string | null
          pricing_policy_id?: string | null
          spec_json: Json
          superseded_by?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          destination_location_id?: string | null
          doc_name?: string | null
          excel_attachment_id?: string | null
          freight_quote_ids?: string[] | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          internal_slug?: string
          is_current?: boolean
          metadata?: Json
          notes?: string | null
          pdf_attachment_id?: string | null
          pricing_policy_id?: string | null
          spec_json?: Json
          superseded_by?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_sheets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_excel_attachment_id_fkey"
            columns: ["excel_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_pdf_attachment_id_fkey"
            columns: ["pdf_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_pricing_policy_id_fkey"
            columns: ["pricing_policy_id"]
            isOneToOne: false
            referencedRelation: "pricing_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "price_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "price_sheets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      pricing_policies: {
        Row: {
          competitive_tolerance: Json | null
          created_at: string
          customer_id: string | null
          effective_from: string
          effective_to: string | null
          freight_flat_per_case: number | null
          freight_markup_pct: number | null
          freight_treatment: string
          id: string
          min_acceptable_margin_pct: number | null
          name: string
          notes: string | null
          scope: string
          scope_id: string | null
          target_margin_pct: number
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          competitive_tolerance?: Json | null
          created_at?: string
          customer_id?: string | null
          effective_from: string
          effective_to?: string | null
          freight_flat_per_case?: number | null
          freight_markup_pct?: number | null
          freight_treatment?: string
          id?: string
          min_acceptable_margin_pct?: number | null
          name: string
          notes?: string | null
          scope: string
          scope_id?: string | null
          target_margin_pct: number
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          competitive_tolerance?: Json | null
          created_at?: string
          customer_id?: string | null
          effective_from?: string
          effective_to?: string | null
          freight_flat_per_case?: number | null
          freight_markup_pct?: number | null
          freight_treatment?: string
          id?: string
          min_acceptable_margin_pct?: number | null
          name?: string
          notes?: string | null
          scope?: string
          scope_id?: string | null
          target_margin_pct?: number
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "pricing_policies_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          default_freight_class: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_freight_class?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_freight_class?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_list_members: {
        Row: {
          added_at: string
          company_id: string
          list_id: string
          note: string | null
          position: number | null
        }
        Insert: {
          added_at?: string
          company_id: string
          list_id: string
          note?: string | null
          position?: number | null
        }
        Update: {
          added_at?: string
          company_id?: string
          list_id?: string
          note?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "prospect_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminder_exclusions: {
        Row: {
          action_kind: string
          created_at: string
          id: string
          scope: string
          target_company_id: string | null
          target_note_id: string | null
          target_person_id: string | null
        }
        Insert: {
          action_kind: string
          created_at?: string
          id?: string
          scope?: string
          target_company_id?: string | null
          target_note_id?: string | null
          target_person_id?: string | null
        }
        Update: {
          action_kind?: string
          created_at?: string
          id?: string
          scope?: string
          target_company_id?: string | null
          target_note_id?: string | null
          target_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_exclusions_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          ai_flagged: boolean
          answer: string | null
          answered_at: string | null
          created_at: string
          entity_company_id: string | null
          entity_person_id: string | null
          id: string
          pinned: boolean
          prompt_text: string
          scheduled_for_day: string
          snooze_until: string | null
          source_note_action_id: string | null
          source_quote: string | null
          status: string
        }
        Insert: {
          ai_flagged?: boolean
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          entity_company_id?: string | null
          entity_person_id?: string | null
          id?: string
          pinned?: boolean
          prompt_text: string
          scheduled_for_day?: string
          snooze_until?: string | null
          source_note_action_id?: string | null
          source_quote?: string | null
          status?: string
        }
        Update: {
          ai_flagged?: boolean
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          entity_company_id?: string | null
          entity_person_id?: string | null
          id?: string
          pinned?: boolean
          prompt_text?: string
          scheduled_for_day?: string
          snooze_until?: string | null
          source_note_action_id?: string | null
          source_quote?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_company_id_fkey"
            columns: ["entity_company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "reminders_entity_person_id_fkey"
            columns: ["entity_person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_source_note_action_id_fkey"
            columns: ["source_note_action_id"]
            isOneToOne: false
            referencedRelation: "note_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_state: {
        Row: {
          account: string
          job: string
          last_status: string | null
          last_success_at: string | null
          machine: string | null
          updated_at: string
          watermark: string | null
        }
        Insert: {
          account?: string
          job: string
          last_status?: string | null
          last_success_at?: string | null
          machine?: string | null
          updated_at?: string
          watermark?: string | null
        }
        Update: {
          account?: string
          job?: string
          last_status?: string | null
          last_success_at?: string | null
          machine?: string | null
          updated_at?: string
          watermark?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          content: string
          created_at: string
          day_date: string
          first_appeared_date: string
          id: string
          source_note_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          content: string
          created_at?: string
          day_date?: string
          first_appeared_date?: string
          id?: string
          source_note_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          content?: string
          created_at?: string
          day_date?: string
          first_appeared_date?: string
          id?: string
          source_note_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_competitor_xref: {
        Row: {
          competitor_product_id: string
          created_at: string
          id: string
          notes: string | null
          relationship: string
          source: string
          updated_at: string
          vendor_product_id: string
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          competitor_product_id: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship?: string
          source: string
          updated_at?: string
          vendor_product_id: string
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          competitor_product_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          relationship?: string
          source?: string
          updated_at?: string
          vendor_product_id?: string
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_competitor_xref_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_competitor_xref_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_costs: {
        Row: {
          cost_basis: string
          cost_per_case: number
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          markup_factor: number
          notes: string | null
          origin_location_id: string | null
          source: string | null
          vendor_product_id: string
        }
        Insert: {
          cost_basis?: string
          cost_per_case: number
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          markup_factor?: number
          notes?: string | null
          origin_location_id?: string | null
          source?: string | null
          vendor_product_id: string
        }
        Update: {
          cost_basis?: string
          cost_per_case?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          markup_factor?: number
          notes?: string | null
          origin_location_id?: string | null
          source?: string | null
          vendor_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_costs_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_product_warehouses: {
        Row: {
          allocated_qty_cases: number
          created_at: string
          id: string
          inventory_as_of: string | null
          inventory_qty_cases: number | null
          is_primary: boolean
          lead_time_days: number | null
          location_id: string
          notes: string | null
          reorder_point_cases: number | null
          reorder_qty_cases: number | null
          updated_at: string
          vendor_product_id: string
        }
        Insert: {
          allocated_qty_cases?: number
          created_at?: string
          id?: string
          inventory_as_of?: string | null
          inventory_qty_cases?: number | null
          is_primary?: boolean
          lead_time_days?: number | null
          location_id: string
          notes?: string | null
          reorder_point_cases?: number | null
          reorder_qty_cases?: number | null
          updated_at?: string
          vendor_product_id: string
        }
        Update: {
          allocated_qty_cases?: number
          created_at?: string
          id?: string
          inventory_as_of?: string | null
          inventory_qty_cases?: number | null
          is_primary?: boolean
          lead_time_days?: number | null
          location_id?: string
          notes?: string | null
          reorder_point_cases?: number | null
          reorder_qty_cases?: number | null
          updated_at?: string
          vendor_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_warehouses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          canonical_product_id: string | null
          case_height_in: number | null
          case_length_in: number | null
          case_pack_count: number | null
          case_weight_lb: number | null
          case_width_in: number | null
          cases_per_40hc: number | null
          cases_per_pallet: number | null
          created_at: string
          deleted_at: string | null
          description: string
          freight_class: string | null
          freight_class_computed: string | null
          freight_class_override_reason: string | null
          gtin: string | null
          id: string
          is_active: boolean
          manufacturer_item_code: string | null
          metadata: Json
          notes: string | null
          pack_display: string | null
          physical_specs_verified: boolean
          sku: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          canonical_product_id?: string | null
          case_height_in?: number | null
          case_length_in?: number | null
          case_pack_count?: number | null
          case_weight_lb?: number | null
          case_width_in?: number | null
          cases_per_40hc?: number | null
          cases_per_pallet?: number | null
          created_at?: string
          deleted_at?: string | null
          description: string
          freight_class?: string | null
          freight_class_computed?: string | null
          freight_class_override_reason?: string | null
          gtin?: string | null
          id?: string
          is_active?: boolean
          manufacturer_item_code?: string | null
          metadata?: Json
          notes?: string | null
          pack_display?: string | null
          physical_specs_verified?: boolean
          sku: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          canonical_product_id?: string | null
          case_height_in?: number | null
          case_length_in?: number | null
          case_pack_count?: number | null
          case_weight_lb?: number | null
          case_width_in?: number | null
          cases_per_40hc?: number | null
          cases_per_pallet?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          freight_class?: string | null
          freight_class_computed?: string | null
          freight_class_override_reason?: string | null
          gtin?: string | null
          id?: string
          is_active?: boolean
          manufacturer_item_code?: string | null
          metadata?: Json
          notes?: string | null
          pack_display?: string | null
          physical_specs_verified?: boolean
          sku?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      vendor_purchase_orders: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          customer_order_id: string | null
          id: string
          metadata: Json
          notes: string | null
          origin_location_id: string | null
          pdf_attachment_id: string | null
          po_number: string
          sent_at: string | null
          ship_date: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          customer_order_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          origin_location_id?: string | null
          pdf_attachment_id?: string | null
          po_number: string
          sent_at?: string | null
          ship_date?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          customer_order_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          origin_location_id?: string | null
          pdf_attachment_id?: string | null
          po_number?: string
          sent_at?: string | null
          ship_date?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_purchase_orders_customer_order_id_fkey"
            columns: ["customer_order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_pdf_attachment_id_fkey"
            columns: ["pdf_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "vendor_purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
    }
    Views: {
      chain_prospects: {
        Row: {
          business_model_name: string | null
          business_model_slug: string | null
          chain_stage: string | null
          company_id: string | null
          cuisine_primary: string | null
          cuisine_secondary: string | null
          est_annual_case_volume: number | null
          est_annual_revenue_usd: number | null
          est_confidence: string | null
          franchisee_parent_id: string | null
          franchisee_parent_name: string | null
          lead_source: string | null
          lead_source_date: string | null
          name: string | null
          operates_brand_ids: string[] | null
          pipeline_stage: string | null
          priority_tier: string | null
          region: string | null
          unit_count: number | null
          unit_count_estimated: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "companies_franchisee_parent_id_fkey"
            columns: ["franchisee_parent_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      companies_by_region: {
        Row: {
          company_count: number | null
          customers: number | null
          prospects: number | null
          region: string | null
          vendors: number | null
        }
        Relationships: []
      }
      companies_last_touch: {
        Row: {
          call_count: number | null
          company_id: string | null
          company_name: string | null
          company_type: string | null
          email_count: number | null
          has_overdue_followup: boolean | null
          interaction_count: number | null
          last_interaction_at: string | null
          meeting_count: number | null
          slug: string | null
        }
        Relationships: []
      }
      companies_last_touch_servous: {
        Row: {
          company_id: string | null
          interaction_count: number | null
          last_inbound_at: string | null
          last_interaction_at: string | null
          last_outbound_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      competitor_prices_current: {
        Row: {
          competitor_product_id: string | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string | null
          notes: string | null
          origin_location_id: string | null
          price_basis: string | null
          price_per_case: number | null
          source: string | null
          source_attachment_id: string | null
        }
        Insert: {
          competitor_product_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          notes?: string | null
          origin_location_id?: string | null
          price_basis?: string | null
          price_per_case?: number | null
          source?: string | null
          source_attachment_id?: string | null
        }
        Update: {
          competitor_product_id?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          notes?: string | null
          origin_location_id?: string | null
          price_basis?: string | null
          price_per_case?: number | null
          source?: string | null
          source_attachment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_competitor_product_id_fkey"
            columns: ["competitor_product_id"]
            isOneToOne: false
            referencedRelation: "competitor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_prices_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_effective_pricing: {
        Row: {
          competitive_tolerance: Json | null
          customer_id: string | null
          customer_name: string | null
          freight_treatment: string | null
          min_acceptable_margin_pct: number | null
          policy_name: string | null
          policy_scope: string | null
          slug: string | null
          target_margin_pct: number | null
        }
        Relationships: []
      }
      customer_order_summary: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          fulfilled_orders: number | null
          last_quoted_at: string | null
          last_shipped_at: string | null
          lifetime_revenue: number | null
          open_quotes: number | null
          order_count: number | null
          pending_orders: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "chain_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "companies_last_touch"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_effective_pricing"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "distributor_prospects"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "needs_review_queue"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospect_summary"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "prospects_needing_followup"
            referencedColumns: ["company_id"]
          },
        ]
      }
      distributor_prospects: {
        Row: {
          business_model_name: string | null
          business_model_slug: string | null
          buying_group_name: string | null
          company_id: string | null
          est_annual_revenue_usd: number | null
          est_confidence: string | null
          lead_source: string | null
          lead_source_date: string | null
          name: string | null
          pipeline_stage: string | null
          priority_tier: string | null
          region: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      inventory_low_stock: {
        Row: {
          allocated: number | null
          available: number | null
          city: string | null
          description: string | null
          last_counted_at: string | null
          lead_time_days: number | null
          on_hand: number | null
          reorder_point: number | null
          reorder_qty: number | null
          sku: string | null
          state: string | null
          status: string | null
          vendor: string | null
          vendor_product_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_product_warehouses_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_system_snapshots: {
        Row: {
          count_method: string | null
          counted_at: string | null
          counted_by: string | null
          created_at: string | null
          id: string | null
          location_id: string | null
          notes: string | null
          pallets_on_hand: number | null
          qty_cases: number | null
          qty_picked_cases: number | null
          source_file: string | null
          vendor_product_id: string | null
        }
        Insert: {
          count_method?: string | null
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string | null
          id?: string | null
          location_id?: string | null
          notes?: string | null
          pallets_on_hand?: number | null
          qty_cases?: number | null
          qty_picked_cases?: number | null
          source_file?: string | null
          vendor_product_id?: string | null
        }
        Update: {
          count_method?: string | null
          counted_at?: string | null
          counted_by?: string | null
          created_at?: string | null
          id?: string | null
          location_id?: string | null
          notes?: string | null
          pallets_on_hand?: number | null
          qty_cases?: number | null
          qty_picked_cases?: number | null
          source_file?: string | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      lane_recent_minima: {
        Row: {
          avg_min_total: number | null
          cheapest_total: number | null
          dest_location_id: string | null
          dest_zip: string | null
          freight_class: string | null
          most_recent_pull: string | null
          origin_location_id: string | null
          origin_zip: string | null
          pallet_qty: number | null
          quote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_quotes_dest_location_id_fkey"
            columns: ["dest_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_quotes_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      needs_review_queue: {
        Row: {
          business_model_slug: string | null
          company_id: string | null
          name: string | null
          notes: string | null
          region: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          business_model_slug?: string | null
          company_id?: string | null
          name?: string | null
          notes?: string | null
          region?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          business_model_slug?: string | null
          company_id?: string | null
          name?: string | null
          notes?: string | null
          region?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      product_master: {
        Row: {
          baily_description: string | null
          baily_price: number | null
          baily_price_basis: string | null
          baily_price_date: string | null
          baily_sku: string | null
          canonical_name: string | null
          canonical_product_id: string | null
          duro_description: string | null
          duro_price: number | null
          duro_price_basis: string | null
          duro_price_date: string | null
          duro_sku: string | null
          lowest_competitor_price: number | null
          metro_description: string | null
          metro_price: number | null
          metro_price_basis: string | null
          metro_price_date: string | null
          metro_sku: string | null
          servous_description: string | null
          servous_sku: string | null
          toro_description: string | null
          toro_price: number | null
          toro_price_basis: string | null
          toro_price_date: string | null
          toro_sku: string | null
          vendor_product_id: string | null
          webstaurant_description: string | null
          webstaurant_price: number | null
          webstaurant_price_basis: string | null
          webstaurant_price_date: string | null
          webstaurant_sku: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_master_health: {
        Row: {
          baily_sku: string | null
          canonical_name: string | null
          duro_sku: string | null
          health_flags: string[] | null
          metro_sku: string | null
          servous_sku: string | null
          toro_sku: string | null
          webstaurant_sku: string | null
        }
        Relationships: []
      }
      prospect_pipeline: {
        Row: {
          n: number | null
          pipeline_stage: string | null
          region: string | null
          vertical: string | null
        }
        Relationships: []
      }
      prospect_summary: {
        Row: {
          business_model_name: string | null
          business_model_slug: string | null
          buying_group_name: string | null
          chain_stage: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          cuisine_primary: string | null
          est_annual_case_volume: number | null
          est_annual_revenue_usd: number | null
          est_confidence: string | null
          interaction_count: number | null
          last_interaction_at: string | null
          lead_source: string | null
          lead_source_date: string | null
          name: string | null
          pipeline_stage: string | null
          primary_contact_email: string | null
          primary_contact_function: string | null
          primary_contact_is_dm: boolean | null
          primary_contact_name: string | null
          primary_contact_seniority: string | null
          priority_tier: string | null
          region: string | null
          state: string | null
          type: string | null
          unit_count: number | null
          updated_at: string | null
          vertical: string | null
          zip: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      prospects_needing_followup: {
        Row: {
          business_model_name: string | null
          business_model_slug: string | null
          company_id: string | null
          days_since_last: number | null
          interaction_count: number | null
          last_interaction_at: string | null
          name: string | null
          pipeline_stage: string | null
          priority_tier: string | null
          region: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_business_model_slug_fkey"
            columns: ["business_model_slug"]
            isOneToOne: false
            referencedRelation: "business_models"
            referencedColumns: ["slug"]
          },
        ]
      }
      qsr_chains_by_region: {
        Row: {
          chain_stage: string | null
          cuisine_primary: string | null
          n: number | null
          region: string | null
        }
        Relationships: []
      }
      servous_vs_crystalware: {
        Row: {
          candidate_role: string | null
          cw_brand: string | null
          cw_case_wt_lb: number | null
          cw_cases_per_pallet: number | null
          cw_cube_ft: number | null
          cw_half_tl: number | null
          cw_item: string | null
          cw_pack_count: number | null
          cw_six_plus: number | null
          cw_sku: string | null
          cw_ti_hi: string | null
          cw_tl: number | null
          match_note: string | null
          match_status: string | null
          our_wt_vs_theirs_lb: number | null
          our_wt_vs_theirs_pct: number | null
          our_wt_vs_theirs_per_unit_pct: number | null
          pack_comparability: string | null
          relationship: string | null
          servous_case_wt_lb: number | null
          servous_cases_per_pallet: number | null
          servous_item: string | null
          servous_pack: string | null
          servous_pack_count: number | null
          servous_sku: string | null
        }
        Relationships: []
      }
      vendor_costs_current: {
        Row: {
          cost_basis: string | null
          cost_per_case: number | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string | null
          markup_factor: number | null
          notes: string | null
          origin_location_id: string | null
          source: string | null
          vendor_product_id: string | null
        }
        Insert: {
          cost_basis?: string | null
          cost_per_case?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          markup_factor?: number | null
          notes?: string | null
          origin_location_id?: string | null
          source?: string | null
          vendor_product_id?: string | null
        }
        Update: {
          cost_basis?: string | null
          cost_per_case?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string | null
          markup_factor?: number | null
          notes?: string | null
          origin_location_id?: string | null
          source?: string | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_costs_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "product_master"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_pallet_audit"
            referencedColumns: ["vendor_product_id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_audit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_resolved"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_class_suggested"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_costs_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products_freight_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_pallet_audit: {
        Row: {
          baily_case_pack: number | null
          baily_cases_per_pallet: number | null
          baily_description: string | null
          baily_sku: string | null
          canonical_product_id: string | null
          drift: string | null
          our_case_pack: number | null
          our_cases_per_pallet: number | null
          our_description: string | null
          our_pallet_source: string | null
          our_sku: string | null
          our_vendor: string | null
          recorded_baily_sku: string | null
          vendor_product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_canonical_product_id_fkey"
            columns: ["canonical_product_id"]
            isOneToOne: false
            referencedRelation: "canonical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products_freight_class_audit: {
        Row: {
          computed_class: string | null
          description: string | null
          freight_class_override_reason: string | null
          id: string | null
          override_class: string | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          computed_class?: string | null
          description?: string | null
          freight_class_override_reason?: string | null
          id?: string | null
          override_class?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          computed_class?: string | null
          description?: string | null
          freight_class_override_reason?: string | null
          id?: string | null
          override_class?: string | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_products_freight_class_resolved: {
        Row: {
          category_default_class: string | null
          computed_class: string | null
          description: string | null
          freight_class_override_reason: string | null
          id: string | null
          override_class: string | null
          resolution_source: string | null
          resolved_class: string | null
          sku: string | null
          vendor_slug: string | null
        }
        Relationships: []
      }
      vendor_products_freight_class_suggested: {
        Row: {
          case_cube_cu_ft: number | null
          case_weight_lb: number | null
          cases_per_pallet: number | null
          description: string | null
          id: string | null
          sku: string | null
          stored_class: string | null
          suggested_class: string | null
          suggested_pcf: number | null
        }
        Insert: {
          case_cube_cu_ft?: never
          case_weight_lb?: number | null
          cases_per_pallet?: number | null
          description?: string | null
          id?: string | null
          sku?: string | null
          stored_class?: string | null
          suggested_class?: string | null
          suggested_pcf?: never
        }
        Update: {
          case_cube_cu_ft?: never
          case_weight_lb?: number | null
          cases_per_pallet?: number | null
          description?: string | null
          id?: string | null
          sku?: string | null
          stored_class?: string | null
          suggested_class?: string | null
          suggested_pcf?: never
        }
        Relationships: []
      }
      vendor_products_freight_readiness: {
        Row: {
          description: string | null
          has_measured_tihi: boolean | null
          id: string | null
          missing_inputs: string[] | null
          physical_specs_verified: boolean | null
          readiness: string | null
          resolution_source: string | null
          resolved_class: string | null
          sku: string | null
          vendor_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      available_qty_cases: {
        Args: { p_location_id?: string; p_vendor_product_id: string }
        Returns: number
      }
      classify_region: {
        Args: { p_state: string; p_zip?: string }
        Returns: string
      }
      fn_catalog_for_customer: {
        Args: { p_customer_id: string; p_vendor_id: string }
        Returns: {
          canonical_product_id: string
          case_height_in: number
          case_length_in: number
          case_weight_kg: number
          case_weight_lb: number
          case_width_in: number
          cases_per_40hc: number
          cases_per_pallet: number
          category_id: string
          category_name: string
          category_slug: string
          cbm_per_case: number
          cost_per_case: number
          description: string
          dims_verified: boolean
          metadata: Json
          min_case_qty_override: number
          pack_display: string
          pack_multiple: number
          physical_specs_verified: boolean
          pieces_per_case: number
          pre_palletized: boolean
          product_name: string
          sell_price_per_case: number
          target_margin_pct: number
          vendor_id: string
          vendor_product_id: string
          vendor_sku: string
        }[]
      }
      fn_inbound_create: {
        Args: {
          p_container_no: string
          p_destination_location_id: string
          p_eta: string
          p_etd: string
          p_lines: Json
          p_notes: string
          p_po_number: string
          p_vendor_id: string
        }
        Returns: string
      }
      fn_inbound_delete: { Args: { p_shipment_id: string }; Returns: undefined }
      freight_class_for_sku: {
        Args: { p_sku: string; p_vendor_slug?: string }
        Returns: string
      }
      merge_canonical: {
        Args: { from_id: string; reason: string; to_id: string }
        Returns: undefined
      }
      nmfc_class_from_density: { Args: { pcf: number }; Returns: number }
      pallet_density_pcf: {
        Args: {
          case_cube_cu_ft: number
          case_weight_lb: number
          cases_per_pallet: number
          packing_loss_pct?: number
          pallet_weight_lb?: number
        }
        Returns: number
      }
      pallet_density_pcf_tendered: {
        Args: {
          case_height_in: number
          case_weight_lb: number
          footprint_sq_in?: number
          hi: number
          pallet_height_in?: number
          pallet_weight_lb?: number
          ti: number
        }
        Returns: number
      }
      policy_for_customer: {
        Args: { p_customer_id: string }
        Returns: {
          competitive_tolerance: Json | null
          created_at: string
          customer_id: string | null
          effective_from: string
          effective_to: string | null
          freight_flat_per_case: number | null
          freight_markup_pct: number | null
          freight_treatment: string
          id: string
          min_acceptable_margin_pct: number | null
          name: string
          notes: string | null
          scope: string
          scope_id: string | null
          target_margin_pct: number
          updated_at: string
          vendor_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pricing_policies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      servous_sell_price: {
        Args: {
          p_freight_per_case?: number
          p_target_margin_pct?: number
          p_vendor_cost: number
        }
        Returns: number
      }
      slugify: { Args: { input: string }; Returns: string }
      vendor_true_cost: {
        Args: { cost: Database["public"]["Tables"]["vendor_costs"]["Row"] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
