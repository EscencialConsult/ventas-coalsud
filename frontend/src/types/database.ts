// GENERADO por backend/scripts/gen-types.mjs (npm run types). No editar a mano.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      almacen: {
        Row: {
          activo: boolean;
          created_at: string;
          id: string;
          nombre: string;
          regional_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre: string;
          regional_id: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre?: string;
          regional_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "almacen_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
        ];
      };
      auditoria: {
        Row: {
          accion: string;
          created_at: string;
          datos: NonNullable<Json>;
          entidad: string;
          entidad_id: string;
          id: number;
          regional_id: string | null;
          usuario_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          accion: string;
          created_at?: string;
          datos?: NonNullable<Json>;
          entidad: string;
          entidad_id: string;
          id?: never;
          regional_id?: string | null;
          usuario_id?: string | null;
        };
        Update: {
          accion?: string;
          created_at?: string;
          datos?: NonNullable<Json>;
          entidad?: string;
          entidad_id?: string;
          id?: never;
          regional_id?: string | null;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      cliente: {
        Row: {
          activo: boolean;
          canal: string;
          categoria: string;
          condicion_pago_id: string;
          created_at: string;
          direccion: string | null;
          email: string | null;
          id: string;
          nit: string | null;
          nombre: string;
          razon_social: string | null;
          regional_id: string;
          telefono: string | null;
          updated_at: string;
          vendedor_id: string | null;
          zona: string | null;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          canal: string;
          categoria: string;
          condicion_pago_id: string;
          created_at?: string;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          nit?: string | null;
          nombre: string;
          razon_social?: string | null;
          regional_id: string;
          telefono?: string | null;
          updated_at?: string;
          vendedor_id?: string | null;
          zona?: string | null;
        };
        Update: {
          activo?: boolean;
          canal?: string;
          categoria?: string;
          condicion_pago_id?: string;
          created_at?: string;
          direccion?: string | null;
          email?: string | null;
          id?: string;
          nit?: string | null;
          nombre?: string;
          razon_social?: string | null;
          regional_id?: string;
          telefono?: string | null;
          updated_at?: string;
          vendedor_id?: string | null;
          zona?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_condicion_pago_id_fkey";
            columns: ["condicion_pago_id"];
            isOneToOne: false;
            referencedRelation: "condicion_pago";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      cobranza: {
        Row: {
          anulada_en: string | null;
          anulada_por: string | null;
          created_at: string;
          cxc_saldo_inicial_id: string | null;
          estado: string;
          fecha: string;
          forma_pago: string;
          id: string;
          importe: number;
          motivo_anulacion: string | null;
          nota_venta_id: string | null;
          numero: string;
          observaciones: string | null;
          referencia_pago: string | null;
          regional_id: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          anulada_en?: string | null;
          anulada_por?: string | null;
          created_at?: string;
          cxc_saldo_inicial_id?: string | null;
          estado?: string;
          fecha: string;
          forma_pago: string;
          id?: string;
          importe: number;
          motivo_anulacion?: string | null;
          nota_venta_id?: string | null;
          numero: string;
          observaciones?: string | null;
          referencia_pago?: string | null;
          regional_id: string;
          usuario_id: string;
        };
        Update: {
          anulada_en?: string | null;
          anulada_por?: string | null;
          created_at?: string;
          cxc_saldo_inicial_id?: string | null;
          estado?: string;
          fecha?: string;
          forma_pago?: string;
          id?: string;
          importe?: number;
          motivo_anulacion?: string | null;
          nota_venta_id?: string | null;
          numero?: string;
          observaciones?: string | null;
          referencia_pago?: string | null;
          regional_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cobranza_anulada_por_fkey";
            columns: ["anulada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_cxc_saldo_inicial_id_fkey";
            columns: ["cxc_saldo_inicial_id"];
            isOneToOne: false;
            referencedRelation: "cxc_saldo_inicial";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
        ];
      };
      condicion_pago: {
        Row: {
          activo: boolean;
          created_at: string;
          dias: number;
          id: string;
          nombre: string;
          orden: number;
          tipo: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          created_at?: string;
          dias?: number;
          id?: string;
          nombre: string;
          orden?: number;
          tipo: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          dias?: number;
          id?: string;
          nombre?: string;
          orden?: number;
          tipo?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      correlativo: {
        Row: {
          regional_id: string;
          tipo_documento: string;
          ultimo: number;
        };
        ComputedFields: never;
        Insert: {
          regional_id: string;
          tipo_documento: string;
          ultimo?: number;
        };
        Update: {
          regional_id?: string;
          tipo_documento?: string;
          ultimo?: number;
        };
        Relationships: [
          {
            foreignKeyName: "correlativo_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
        ];
      };
      cxc_saldo_inicial: {
        Row: {
          cliente_id: string;
          created_at: string;
          fecha_documento: string;
          fecha_vencimiento: string | null;
          id: string;
          importe: number;
          numero_documento: string;
          observaciones: string | null;
          regional_id: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          cliente_id: string;
          created_at?: string;
          fecha_documento: string;
          fecha_vencimiento?: string | null;
          id?: string;
          importe: number;
          numero_documento: string;
          observaciones?: string | null;
          regional_id: string;
          usuario_id: string;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          fecha_documento?: string;
          fecha_vencimiento?: string | null;
          id?: string;
          importe?: number;
          numero_documento?: string;
          observaciones?: string | null;
          regional_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cxc_saldo_inicial_cliente_id_regional_id_fkey";
            columns: ["cliente_id", "regional_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id", "regional_id"];
          },
          {
            foreignKeyName: "cxc_saldo_inicial_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cxc_saldo_inicial_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
        ];
      };
      devolucion: {
        Row: {
          created_at: string;
          fecha: string;
          id: string;
          motivo: string;
          nc_contable_numero: string | null;
          nota_venta_id: string;
          numero: string;
          regional_id: string;
          tipo_reverso: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          fecha: string;
          id?: string;
          motivo: string;
          nc_contable_numero?: string | null;
          nota_venta_id: string;
          numero: string;
          regional_id: string;
          tipo_reverso: string;
          usuario_id: string;
        };
        Update: {
          created_at?: string;
          fecha?: string;
          id?: string;
          motivo?: string;
          nc_contable_numero?: string | null;
          nota_venta_id?: string;
          numero?: string;
          regional_id?: string;
          tipo_reverso?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devolucion_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
        ];
      };
      devolucion_item: {
        Row: {
          cantidad: number;
          devolucion_id: string;
          id: string;
          precio_aplicado: number;
          producto_id: string;
        };
        ComputedFields: never;
        Insert: {
          cantidad: number;
          devolucion_id: string;
          id?: string;
          precio_aplicado: number;
          producto_id: string;
        };
        Update: {
          cantidad?: number;
          devolucion_id?: string;
          id?: string;
          precio_aplicado?: number;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devolucion_item_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_item_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "v_devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_item_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_inventario: {
        Row: {
          almacen_destino_id: string | null;
          almacen_id: string;
          created_at: string;
          fecha: string;
          id: string;
          motivo: string | null;
          numero: string;
          referencia: string | null;
          regional_id: string;
          tipo: string;
          usuario_id: string;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          almacen_destino_id?: string | null;
          almacen_id: string;
          created_at?: string;
          fecha: string;
          id?: string;
          motivo?: string | null;
          numero: string;
          referencia?: string | null;
          regional_id: string;
          tipo: string;
          usuario_id: string;
          vendedor_id?: string | null;
        };
        Update: {
          almacen_destino_id?: string | null;
          almacen_id?: string;
          created_at?: string;
          fecha?: string;
          id?: string;
          motivo?: string | null;
          numero?: string;
          referencia?: string | null;
          regional_id?: string;
          tipo?: string;
          usuario_id?: string;
          vendedor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documento_inventario_almacen_destino_id_fkey";
            columns: ["almacen_destino_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_almacen_id_fkey";
            columns: ["almacen_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      documento_inventario_item: {
        Row: {
          cantidad: number;
          documento_id: string;
          id: string;
          producto_id: string;
        };
        ComputedFields: never;
        Insert: {
          cantidad: number;
          documento_id: string;
          id?: string;
          producto_id: string;
        };
        Update: {
          cantidad?: number;
          documento_id?: string;
          id?: string;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documento_inventario_item_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_item_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "v_documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_item_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
        ];
      };
      linea_comercial: {
        Row: {
          activo: boolean;
          created_at: string;
          id: string;
          nombre: string;
          orden: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre: string;
          orden?: number;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre?: string;
          orden?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      liquidacion: {
        Row: {
          cerrada_en: string | null;
          cerrada_por: string | null;
          created_at: string;
          descuento_contado: number | null;
          descuento_credito: number | null;
          estado: string;
          fecha: string;
          id: string;
          motivo_reapertura: string | null;
          reabierta_en: string | null;
          reabierta_por: string | null;
          regional_id: string;
          total_cobranzas: number | null;
          total_contado_bruto: number | null;
          total_credito_bruto: number | null;
          total_efectivo: number | null;
          total_reembolsos: number | null;
          total_ventas: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          cerrada_en?: string | null;
          cerrada_por?: string | null;
          created_at?: string;
          descuento_contado?: number | null;
          descuento_credito?: number | null;
          estado?: string;
          fecha: string;
          id?: string;
          motivo_reapertura?: string | null;
          reabierta_en?: string | null;
          reabierta_por?: string | null;
          regional_id: string;
          total_cobranzas?: number | null;
          total_contado_bruto?: number | null;
          total_credito_bruto?: number | null;
          total_efectivo?: number | null;
          total_reembolsos?: number | null;
          total_ventas?: number | null;
          updated_at?: string;
        };
        Update: {
          cerrada_en?: string | null;
          cerrada_por?: string | null;
          created_at?: string;
          descuento_contado?: number | null;
          descuento_credito?: number | null;
          estado?: string;
          fecha?: string;
          id?: string;
          motivo_reapertura?: string | null;
          reabierta_en?: string | null;
          reabierta_por?: string | null;
          regional_id?: string;
          total_cobranzas?: number | null;
          total_contado_bruto?: number | null;
          total_credito_bruto?: number | null;
          total_efectivo?: number | null;
          total_reembolsos?: number | null;
          total_ventas?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "liquidacion_cerrada_por_fkey";
            columns: ["cerrada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_reabierta_por_fkey";
            columns: ["reabierta_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
        ];
      };
      liquidacion_linea: {
        Row: {
          ajuste: number;
          devolucion: number;
          id: string;
          linea_id: string;
          linea_nombre: string;
          liquidacion_id: string;
          orden_linea: number;
          orden_producto: number;
          pedido: number;
          precio_unit: number;
          producto_id: string;
          producto_nombre: string;
          saldo_final: number;
          saldo_inicial: number;
          total_ventas_bs: number;
          total_ventas_q: number;
          traspaso: number;
          venta_contado_bs: number;
          venta_contado_q: number;
          venta_credito_bs: number;
          venta_credito_q: number;
        };
        ComputedFields: never;
        Insert: {
          ajuste?: number;
          devolucion?: number;
          id?: string;
          linea_id: string;
          linea_nombre: string;
          liquidacion_id: string;
          orden_linea: number;
          orden_producto: number;
          pedido?: number;
          precio_unit: number;
          producto_id: string;
          producto_nombre: string;
          saldo_final: number;
          saldo_inicial?: number;
          total_ventas_bs?: number;
          total_ventas_q?: number;
          traspaso?: number;
          venta_contado_bs?: number;
          venta_contado_q?: number;
          venta_credito_bs?: number;
          venta_credito_q?: number;
        };
        Update: {
          ajuste?: number;
          devolucion?: number;
          id?: string;
          linea_id?: string;
          linea_nombre?: string;
          liquidacion_id?: string;
          orden_linea?: number;
          orden_producto?: number;
          pedido?: number;
          precio_unit?: number;
          producto_id?: string;
          producto_nombre?: string;
          saldo_final?: number;
          saldo_inicial?: number;
          total_ventas_bs?: number;
          total_ventas_q?: number;
          traspaso?: number;
          venta_contado_bs?: number;
          venta_contado_q?: number;
          venta_credito_bs?: number;
          venta_credito_q?: number;
        };
        Relationships: [
          {
            foreignKeyName: "liquidacion_linea_linea_id_fkey";
            columns: ["linea_id"];
            isOneToOne: false;
            referencedRelation: "linea_comercial";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_linea_liquidacion_id_fkey";
            columns: ["liquidacion_id"];
            isOneToOne: false;
            referencedRelation: "liquidacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_linea_liquidacion_id_fkey";
            columns: ["liquidacion_id"];
            isOneToOne: false;
            referencedRelation: "v_liquidacion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_linea_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
        ];
      };
      movimiento_inventario: {
        Row: {
          almacen_id: string;
          cantidad: number;
          created_at: string;
          devolucion_id: string | null;
          documento_id: string | null;
          fecha: string;
          id: string;
          nota_venta_id: string | null;
          producto_id: string;
          regional_id: string;
          tipo: string;
          usuario_id: string;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          almacen_id: string;
          cantidad: number;
          created_at?: string;
          devolucion_id?: string | null;
          documento_id?: string | null;
          fecha: string;
          id?: string;
          nota_venta_id?: string | null;
          producto_id: string;
          regional_id: string;
          tipo: string;
          usuario_id: string;
          vendedor_id?: string | null;
        };
        Update: {
          almacen_id?: string;
          cantidad?: number;
          created_at?: string;
          devolucion_id?: string | null;
          documento_id?: string | null;
          fecha?: string;
          id?: string;
          nota_venta_id?: string | null;
          producto_id?: string;
          regional_id?: string;
          tipo?: string;
          usuario_id?: string;
          vendedor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "movimiento_inventario_almacen_id_fkey";
            columns: ["almacen_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "v_devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "v_documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      nota_venta: {
        Row: {
          anulada_en: string | null;
          anulada_por: string | null;
          canal: string;
          cliente_id: string;
          condicion_pago_id: string;
          condicion_tipo: string;
          created_at: string;
          descuento_pct: number;
          dias_credito: number;
          estado: string;
          factura_pdf_path: string | null;
          factura_registrada_en: string | null;
          fecha: string;
          fecha_vencimiento: string | null;
          id: string;
          motivo_anulacion: string | null;
          numero: string;
          numero_factura: string | null;
          observaciones: string | null;
          origen_stock: string;
          regional_id: string;
          updated_at: string;
          usuario_id: string;
          vendedor_id: string;
        };
        ComputedFields: never;
        Insert: {
          anulada_en?: string | null;
          anulada_por?: string | null;
          canal: string;
          cliente_id: string;
          condicion_pago_id: string;
          condicion_tipo: string;
          created_at?: string;
          descuento_pct?: number;
          dias_credito?: number;
          estado?: string;
          factura_pdf_path?: string | null;
          factura_registrada_en?: string | null;
          fecha: string;
          fecha_vencimiento?: never;
          id?: string;
          motivo_anulacion?: string | null;
          numero: string;
          numero_factura?: string | null;
          observaciones?: string | null;
          origen_stock?: string;
          regional_id: string;
          updated_at?: string;
          usuario_id: string;
          vendedor_id: string;
        };
        Update: {
          anulada_en?: string | null;
          anulada_por?: string | null;
          canal?: string;
          cliente_id?: string;
          condicion_pago_id?: string;
          condicion_tipo?: string;
          created_at?: string;
          descuento_pct?: number;
          dias_credito?: number;
          estado?: string;
          factura_pdf_path?: string | null;
          factura_registrada_en?: string | null;
          fecha?: string;
          fecha_vencimiento?: never;
          id?: string;
          motivo_anulacion?: string | null;
          numero?: string;
          numero_factura?: string | null;
          observaciones?: string | null;
          origen_stock?: string;
          regional_id?: string;
          updated_at?: string;
          usuario_id?: string;
          vendedor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nota_venta_anulada_por_fkey";
            columns: ["anulada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_condicion_pago_id_fkey";
            columns: ["condicion_pago_id"];
            isOneToOne: false;
            referencedRelation: "condicion_pago";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      nota_venta_item: {
        Row: {
          cantidad: number;
          id: string;
          nota_venta_id: string;
          precio_aplicado: number;
          precio_base: number;
          producto_id: string;
          subtotal: number | null;
        };
        ComputedFields: never;
        Insert: {
          cantidad: number;
          id?: string;
          nota_venta_id: string;
          precio_aplicado: number;
          precio_base: number;
          producto_id: string;
          subtotal?: never;
        };
        Update: {
          cantidad?: number;
          id?: string;
          nota_venta_id?: string;
          precio_aplicado?: number;
          precio_base?: number;
          producto_id?: string;
          subtotal?: never;
        };
        Relationships: [
          {
            foreignKeyName: "nota_venta_item_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_item_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_item_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
        ];
      };
      presupuesto: {
        Row: {
          categoria_cliente: string | null;
          created_at: string;
          id: string;
          meta: number;
          observaciones: string | null;
          periodo: string;
          regional_id: string;
          updated_at: string;
          usuario_id: string;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          categoria_cliente?: string | null;
          created_at?: string;
          id?: string;
          meta: number;
          observaciones?: string | null;
          periodo: string;
          regional_id: string;
          updated_at?: string;
          usuario_id: string;
          vendedor_id?: string | null;
        };
        Update: {
          categoria_cliente?: string | null;
          created_at?: string;
          id?: string;
          meta?: number;
          observaciones?: string | null;
          periodo?: string;
          regional_id?: string;
          updated_at?: string;
          usuario_id?: string;
          vendedor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "presupuesto_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presupuesto_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "presupuesto_vendedor_id_regional_id_fkey";
            columns: ["vendedor_id", "regional_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id", "regional_id"];
          },
        ];
      };
      producto: {
        Row: {
          activo: boolean;
          codigo: string | null;
          created_at: string;
          id: string;
          linea_id: string;
          nombre: string;
          orden: number;
          precio_base: number;
          stock_minimo: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          linea_id: string;
          nombre: string;
          orden?: number;
          precio_base: number;
          stock_minimo?: number;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          codigo?: string | null;
          created_at?: string;
          id?: string;
          linea_id?: string;
          nombre?: string;
          orden?: number;
          precio_base?: number;
          stock_minimo?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "producto_linea_id_fkey";
            columns: ["linea_id"];
            isOneToOne: false;
            referencedRelation: "linea_comercial";
            referencedColumns: ["id"];
          },
        ];
      };
      regional: {
        Row: {
          activo: boolean;
          codigo: string;
          created_at: string;
          id: string;
          nombre: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          codigo: string;
          created_at?: string;
          id?: string;
          nombre: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          codigo?: string;
          created_at?: string;
          id?: string;
          nombre?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock_saldo: {
        Row: {
          almacen_id: string;
          cantidad: number;
          id: string;
          producto_id: string;
          regional_id: string;
          updated_at: string;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          almacen_id: string;
          cantidad?: number;
          id?: string;
          producto_id: string;
          regional_id: string;
          updated_at?: string;
          vendedor_id?: string | null;
        };
        Update: {
          almacen_id?: string;
          cantidad?: number;
          id?: string;
          producto_id?: string;
          regional_id?: string;
          updated_at?: string;
          vendedor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_saldo_almacen_id_fkey";
            columns: ["almacen_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_saldo_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_saldo_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_saldo_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      usuario: {
        Row: {
          activo: boolean;
          created_at: string;
          debe_cambiar_password: boolean;
          email: string;
          id: string;
          nombre: string;
          rol: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          created_at?: string;
          debe_cambiar_password?: boolean;
          email: string;
          id: string;
          nombre: string;
          rol: string;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          debe_cambiar_password?: boolean;
          email?: string;
          id?: string;
          nombre?: string;
          rol?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usuario_regional: {
        Row: {
          regional_id: string;
          usuario_id: string;
        };
        ComputedFields: never;
        Insert: {
          regional_id: string;
          usuario_id: string;
        };
        Update: {
          regional_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usuario_regional_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usuario_regional_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
        ];
      };
      vendedor: {
        Row: {
          activo: boolean;
          created_at: string;
          id: string;
          nombre: string;
          regional_id: string;
          telefono: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre: string;
          regional_id: string;
          telefono?: string | null;
          updated_at?: string;
        };
        Update: {
          activo?: boolean;
          created_at?: string;
          id?: string;
          nombre?: string;
          regional_id?: string;
          telefono?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendedor_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_cobranza: {
        Row: {
          anulada_en: string | null;
          anulada_por: string | null;
          cliente_id: string | null;
          cliente_nombre: string;
          created_at: string;
          cxc_saldo_inicial_id: string | null;
          dia_cerrado: boolean | null;
          documento_numero: string | null;
          estado: string;
          fecha: string;
          forma_pago: string;
          id: string;
          importe: number;
          motivo_anulacion: string | null;
          nota_venta_id: string | null;
          numero: string;
          numero_factura: string | null;
          observaciones: string | null;
          referencia_pago: string | null;
          regional_id: string;
          tipo_doc: string | null;
          usuario_id: string;
          usuario_nombre: string | null;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "cobranza_anulada_por_fkey";
            columns: ["anulada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_cxc_saldo_inicial_id_fkey";
            columns: ["cxc_saldo_inicial_id"];
            isOneToOne: false;
            referencedRelation: "cxc_saldo_inicial";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobranza_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
        ];
      };
      v_devolucion: {
        Row: {
          cliente_id: string;
          cliente_nombre: string;
          created_at: string;
          fecha: string;
          id: string;
          importe: number | null;
          motivo: string;
          nc_contable_numero: string | null;
          nota_numero: string;
          nota_venta_id: string;
          numero: string;
          regional_id: string;
          tipo_reverso: string;
          usuario_id: string;
          usuario_nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "devolucion_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devolucion_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
        ];
      };
      v_documento_inventario: {
        Row: {
          almacen_destino_id: string | null;
          almacen_destino_nombre: string | null;
          almacen_id: string;
          almacen_nombre: string;
          created_at: string;
          fecha: string;
          id: string;
          items: number | null;
          motivo: string | null;
          numero: string;
          referencia: string | null;
          regional_destino_id: string | null;
          regional_id: string;
          tipo: string;
          usuario_nombre: string | null;
          vendedor_id: string | null;
          vendedor_nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "almacen_regional_id_fkey";
            columns: ["regional_destino_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_almacen_destino_id_fkey";
            columns: ["almacen_destino_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_almacen_id_fkey";
            columns: ["almacen_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documento_inventario_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      v_liquidacion: {
        Row: {
          cerrada_en: string | null;
          cerrada_por: string | null;
          cerrada_por_nombre: string | null;
          created_at: string;
          descuento_contado: number | null;
          descuento_credito: number | null;
          estado: string;
          fecha: string;
          id: string;
          motivo_reapertura: string | null;
          reabierta_en: string | null;
          reabierta_por: string | null;
          regional_codigo: string;
          regional_id: string;
          total_cobranzas: number | null;
          total_contado_bruto: number | null;
          total_credito_bruto: number | null;
          total_efectivo: number | null;
          total_reembolsos: number | null;
          total_ventas: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "liquidacion_cerrada_por_fkey";
            columns: ["cerrada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_reabierta_por_fkey";
            columns: ["reabierta_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liquidacion_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
        ];
      };
      v_movimiento: {
        Row: {
          almacen_id: string;
          almacen_nombre: string;
          cantidad: number;
          created_at: string;
          devolucion_id: string | null;
          documento_id: string | null;
          documento_numero: string | null;
          fecha: string;
          id: string;
          nota_venta_id: string | null;
          producto_id: string;
          producto_nombre: string;
          regional_id: string;
          tipo: string;
          usuario_nombre: string | null;
          vendedor_id: string | null;
          vendedor_nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "movimiento_inventario_almacen_id_fkey";
            columns: ["almacen_id"];
            isOneToOne: false;
            referencedRelation: "almacen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_devolucion_id_fkey";
            columns: ["devolucion_id"];
            isOneToOne: false;
            referencedRelation: "v_devolucion";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_documento_id_fkey";
            columns: ["documento_id"];
            isOneToOne: false;
            referencedRelation: "v_documento_inventario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_nota_venta_id_fkey";
            columns: ["nota_venta_id"];
            isOneToOne: false;
            referencedRelation: "v_nota_venta";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_producto_id_fkey";
            columns: ["producto_id"];
            isOneToOne: false;
            referencedRelation: "producto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimiento_inventario_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      v_nota_venta: {
        Row: {
          abonado: number | null;
          anulada_en: string | null;
          anulada_por: string | null;
          bruto: number | null;
          canal: string;
          cliente_id: string;
          cliente_nit: string | null;
          cliente_nombre: string;
          cobrado: number | null;
          condicion_nombre: string;
          condicion_pago_id: string;
          condicion_tipo: string;
          created_at: string;
          descuento_bs: number | null;
          descuento_pct: number;
          dia_cerrado: boolean | null;
          dias_credito: number;
          estado: string;
          factura_pdf_path: string | null;
          factura_registrada_en: string | null;
          fecha: string;
          fecha_vencimiento: string | null;
          id: string;
          motivo_anulacion: string | null;
          numero: string;
          numero_factura: string | null;
          observaciones: string | null;
          origen_stock: string;
          pendiente_factura: boolean | null;
          regional_codigo: string;
          regional_id: string;
          saldo: number | null;
          tiene_devolucion: boolean | null;
          total: number | null;
          updated_at: string;
          usuario_id: string;
          usuario_nombre: string | null;
          vendedor_id: string;
          vendedor_nombre: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "nota_venta_anulada_por_fkey";
            columns: ["anulada_por"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_condicion_pago_id_fkey";
            columns: ["condicion_pago_id"];
            isOneToOne: false;
            referencedRelation: "condicion_pago";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_regional_id_fkey";
            columns: ["regional_id"];
            isOneToOne: false;
            referencedRelation: "regional";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuario";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nota_venta_vendedor_id_fkey";
            columns: ["vendedor_id"];
            isOneToOne: false;
            referencedRelation: "vendedor";
            referencedColumns: ["id"];
          },
        ];
      };
      v_saldo_documento: {
        Row: {
          abonado: number | null;
          cliente_id: string | null;
          cliente_nombre: string | null;
          cobrado: number | null;
          dias_mora: number | null;
          documento_id: string | null;
          fecha: string | null;
          fecha_vencimiento: string | null;
          importe: number | null;
          numero: string | null;
          numero_factura: string | null;
          regional_id: string | null;
          saldo: number | null;
          tipo_doc: string | null;
          vencido: boolean | null;
          vendedor_id: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      v_stock: {
        Row: {
          almacen_id: string | null;
          almacen_nombre: string;
          bajo_minimo: boolean | null;
          cantidad: number | null;
          linea_id: string;
          linea_nombre: string;
          orden: number | null;
          precio_base: number;
          producto_id: string | null;
          producto_nombre: string;
          regional_id: string | null;
          stock_minimo: number;
          ubicacion: string | null;
          vendedor_id: string | null;
          vendedor_nombre: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "producto_linea_id_fkey";
            columns: ["linea_id"];
            isOneToOne: false;
            referencedRelation: "linea_comercial";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      admin_actualizar_usuario: {
        Args: {
          p_actor: string;
          p_id: string;
          p_nombre?: string;
          p_regionales?: string[];
          p_rol?: string;
        };
        Returns: Json;
      };
      admin_cambiar_activo: {
        Args: { p_activo: boolean; p_actor: string; p_id: string };
        Returns: Json;
      };
      admin_crear_usuario: {
        Args: {
          p_actor: string;
          p_email: string;
          p_id: string;
          p_nombre: string;
          p_regionales: string[];
          p_rol: string;
        };
        Returns: Json;
      };
      admin_marcar_reseteo: { Args: { p_actor: string; p_id: string }; Returns: undefined };
      anular_cobranza: { Args: { p_cobranza_id: string; p_motivo: string }; Returns: Json };
      anular_nota_venta: { Args: { p_motivo: string; p_nota_id: string }; Returns: Json };
      cargar_cartera_inicial: {
        Args: { p_documentos: Json; p_regional_id: string };
        Returns: Json;
      };
      cerrar_liquidacion: { Args: { p_fecha: string; p_regional_id: string }; Returns: Json };
      dias_pendientes_cierre: {
        Args: { p_regional_id?: string };
        Returns: {
          fecha: string;
          notas_sin_factura: number;
          regional_id: string;
        }[];
      };
      emitir_nota_venta: {
        Args: {
          p_canal: string;
          p_cliente_id: string;
          p_condicion_pago_id: string;
          p_descuento_pct: number;
          p_fecha: string;
          p_items: Json;
          p_numero_factura: string;
          p_observaciones: string;
          p_origen_stock: string;
          p_regional_id: string;
          p_vendedor_id: string;
        };
        Returns: Json;
      };
      hoja_carga: {
        Args: { p_fecha: string; p_regional_id: string; p_vendedor_id?: string };
        Returns: Json;
      };
      hoy: { Args: Record<PropertyKey, never>; Returns: string };
      ingresos_vendedores: {
        Args: { p_desde?: string; p_detalle?: boolean; p_hasta?: string; p_regional_id?: string };
        Returns: Json;
      };
      kardex: {
        Args: {
          p_almacen_id: string;
          p_desde?: string;
          p_hasta?: string;
          p_producto_id: string;
          p_vendedor_id: string;
        };
        Returns: {
          cantidad: number;
          documento: string;
          fecha: string;
          id: string;
          saldo_anterior: number;
          saldo_nuevo: number;
          tipo: string;
          usuario: string;
        }[];
      };
      marcar_password_cambiado: { Args: Record<PropertyKey, never>; Returns: undefined };
      max_devolvible: { Args: { p_nota_id: string }; Returns: Json };
      mi_perfil: { Args: Record<PropertyKey, never>; Returns: Json };
      reabrir_liquidacion: {
        Args: { p_fecha: string; p_motivo: string; p_regional_id: string };
        Returns: Json;
      };
      registrar_ajuste: {
        Args: { p_almacen_id: string; p_fecha: string; p_items: Json; p_motivo: string };
        Returns: Json;
      };
      registrar_cobranzas: {
        Args: {
          p_aplicaciones: Json;
          p_fecha: string;
          p_forma_pago: string;
          p_observaciones: string;
          p_referencia_pago: string;
          p_regional_id: string;
        };
        Returns: Json;
      };
      registrar_devolucion: {
        Args: { p_items: Json; p_motivo: string; p_nota_id: string; p_tipo_reverso: string };
        Returns: Json;
      };
      registrar_factura_nota: {
        Args: { p_factura_pdf_path: string; p_nota_id: string; p_numero_factura: string };
        Returns: Json;
      };
      registrar_ingreso: {
        Args: { p_almacen_id: string; p_fecha: string; p_items: Json; p_referencia: string };
        Returns: Json;
      };
      registrar_nc_contable: { Args: { p_devolucion_id: string; p_numero: string }; Returns: Json };
      registrar_retorno: {
        Args: {
          p_almacen_id: string;
          p_fecha: string;
          p_items: Json;
          p_referencia: string;
          p_vendedor_id: string;
        };
        Returns: Json;
      };
      registrar_salida: {
        Args: {
          p_almacen_id: string;
          p_fecha: string;
          p_items: Json;
          p_referencia: string;
          p_vendedor_id: string;
        };
        Returns: Json;
      };
      registrar_traspaso: {
        Args: {
          p_almacen_destino_id: string;
          p_almacen_origen_id: string;
          p_fecha: string;
          p_items: Json;
          p_referencia: string;
        };
        Returns: Json;
      };
      reporte_liquidacion: { Args: { p_fecha: string; p_regional_id: string }; Returns: Json };
      saldo_vendedores: {
        Args: { p_desde?: string; p_hasta?: string; p_regional_id?: string };
        Returns: {
          entregado: number;
          producto: string;
          producto_id: string;
          retornado: number;
          saldo_final: number;
          saldo_inicial: number;
          valorizado: number;
          vendedor: string;
          vendedor_id: string;
          vendido: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
